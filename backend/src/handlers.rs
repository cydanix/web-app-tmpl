use actix_web::{web, HttpRequest, HttpResponse};
use nano_iam::{AuthService, AuthType, IamError, Repo};
use std::sync::Arc;

use crate::auth::{AuthenticatedUser, require_permission};
use crate::config::AppConfig;
use crate::dba::DbContext;
use crate::errors::AppError;
use crate::models::{
    AuthResponse, BatchDeleteResponse, BatchNotificationIdsRequest,
    BatchUpdateNotificationsRequest, ChangePasswordRequest, CreateInvitationRequest,
    CreateNotificationRequest, DeleteAccountRequest, GoogleLoginRequest, HealthResponse,
    LoginRequest, LogoutRequest, OrgInvitationInfo, OrgMemberInfo, OrgResponse,
    PaginationQuery, ProfileSettings, RefreshTokenRequest, ResendVerificationRequest,
    SignupRequest, SignupResponse, UpdateMemberRoleRequest, UpdateNotificationRequest,
    UpdateProfileSettingsRequest, UserInfo, VerifyEmailRequest,
};

fn build_user_info(user: &AuthenticatedUser, iam: &nano_iam::Account) -> UserInfo {
    UserInfo {
        id: user.profile.id,
        email: iam.email.clone(),
        display_name: user.profile.display_name.clone(),
        avatar_url: user.profile.avatar_url.clone(),
        username: user.profile.username.clone(),
        auth_type: format!("{:?}", iam.auth_type).to_lowercase(),
        org_id: user.org.id,
        org_name: user.org.name.clone(),
        role: user.role_name.clone(),
        permissions: user.permissions.clone(),
    }
}

fn client_ip(req: &HttpRequest) -> Option<String> {
    req.connection_info()
        .realip_remote_addr()
        .map(|s| s.to_string())
}

// --------------- Auth handlers ---------------

pub async fn signup(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    req: web::Json<SignupRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let iam_account = match auth_service.register(&req.email, &req.password).await {
        Ok(account) => account,
        Err(IamError::Db(sqlx::Error::Database(db_err))) if db_err.constraint() == Some("accounts_email_key") => {
            return Err(AppError::Conflict("Email already exists".to_string()));
        }
        Err(e) => return Err(e.into()),
    };

    let profile = db.create_profile(iam_account.id, iam_account.email.clone()).await?;

    let org_id = if let Some(ref code) = req.invite_code {
        if let Some(invitation) = db.get_invitation_by_code(code).await? {
            db.add_org_member(invitation.org_id, profile.id, invitation.role_id).await?;
            db.consume_invitation(invitation.id, profile.id).await?;
            invitation.org_id
        } else {
            return Err(AppError::BadRequest("Invalid or expired invitation code".to_string()));
        }
    } else {
        let slug_base = req.email.split('@').next().unwrap_or("user");
        let slug = db.generate_unique_slug(slug_base).await?;
        let org_name = format!("{}'s Organization", slug_base);
        let org = db.create_organization(&org_name, &slug).await?;
        let admin_role = iam_repo.get_role_by_name("admin").await
            .map_err(|_| AppError::Internal("Failed to look up admin role".to_string()))?
            .ok_or_else(|| AppError::Internal("Admin role not found".to_string()))?;
        db.add_org_member(org.id, profile.id, admin_role.id).await?;
        org.id
    };

    let _ = db.write_audit_log(
        Some(profile.id), "signup", "auth",
        Some(&iam_account.email), client_ip(&http_req).as_deref(),
        Some(org_id),
    ).await;

    Ok(HttpResponse::Ok().json(SignupResponse {
        account_id: iam_account.id,
        email: iam_account.email,
        message: "Account created. Please check your email for verification code.".to_string(),
    }))
}

pub async fn verify_email(
    auth_service: web::Data<Arc<AuthService>>,
    req: web::Json<VerifyEmailRequest>,
) -> Result<HttpResponse, AppError> {
    auth_service.verify_email(req.account_id, &req.code).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Email verified successfully" })))
}

pub async fn resend_verification(
    auth_service: web::Data<Arc<AuthService>>,
    req: web::Json<ResendVerificationRequest>,
) -> Result<HttpResponse, AppError> {
    auth_service.resend_verification_email(&req.email).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Verification email sent" })))
}

pub async fn login(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    req: web::Json<LoginRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let login_result = auth_service
        .login_with_auth_type(&req.email, &req.password, AuthType::Email)
        .await?;

    let profile = db.get_or_create_profile(
        login_result.account.id,
        login_result.account.email.clone(),
    ).await?;

    // Ensure user has an org (create one for pre-existing users who lack one)
    let (org, member) = match db.get_org_for_profile(profile.id).await? {
        Some(om) => om,
        None => {
            let slug_base = login_result.account.email.split('@').next().unwrap_or("user");
            let slug = db.generate_unique_slug(slug_base).await?;
            let org_name = format!("{}'s Organization", slug_base);
            let org = db.create_organization(&org_name, &slug).await?;
            let admin_role = iam_repo.get_role_by_name("admin").await
                .map_err(|_| AppError::Internal("Failed to look up admin role".to_string()))?
                .ok_or_else(|| AppError::Internal("Admin role not found".to_string()))?;
            let member = db.add_org_member(org.id, profile.id, admin_role.id).await?;
            (org, member)
        }
    };

    let role_name = match iam_repo.get_role_by_id(member.role_id).await {
        Ok(Some(role)) => role.name,
        _ => "member".to_string(),
    };

    let permissions = iam_repo.get_permissions_for_role(member.role_id).await.unwrap_or_default();

    let notification_message = format!("{} signed in", login_result.account.email);
    if let Err(e) = db.create_notification(profile.id, "info", &notification_message, Some(org.id)).await {
        tracing::warn!("Failed to create sign-in notification: {:?}", e);
    }

    let _ = db.write_audit_log(
        Some(profile.id), "login", "auth",
        None, client_ip(&http_req).as_deref(),
        Some(org.id),
    ).await;

    Ok(HttpResponse::Ok().json(AuthResponse {
        user: UserInfo {
            id: profile.id,
            email: login_result.account.email.clone(),
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            username: profile.username,
            auth_type: format!("{:?}", login_result.account.auth_type).to_lowercase(),
            org_id: org.id,
            org_name: org.name,
            role: role_name,
            permissions,
        },
        access_token: login_result.tokens.access_token.to_string(),
        refresh_token: login_result.tokens.refresh_token.to_string(),
        access_token_expires_at: login_result.tokens.access_token_expires_at,
        refresh_token_expires_at: login_result.tokens.refresh_token_expires_at,
    }))
}

pub async fn google_login(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    req: web::Json<GoogleLoginRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let login_result = auth_service
        .login_with_auth_type("", &req.id_token, AuthType::Google)
        .await?;

    let profile = db.get_or_create_profile(
        login_result.account.id,
        login_result.account.email.clone(),
    ).await?;

    // Ensure user has an org (create one on first Google login)
    let (org, member) = match db.get_org_for_profile(profile.id).await? {
        Some(om) => om,
        None => {
            let slug_base = login_result.account.email.split('@').next().unwrap_or("user");
            let slug = db.generate_unique_slug(slug_base).await?;
            let org_name = format!("{}'s Organization", slug_base);
            let org = db.create_organization(&org_name, &slug).await?;
            let admin_role = iam_repo.get_role_by_name("admin").await
                .map_err(|_| AppError::Internal("Failed to look up admin role".to_string()))?
                .ok_or_else(|| AppError::Internal("Admin role not found".to_string()))?;
            let member = db.add_org_member(org.id, profile.id, admin_role.id).await?;
            (org, member)
        }
    };

    let role_name = match iam_repo.get_role_by_id(member.role_id).await {
        Ok(Some(role)) => role.name,
        _ => "member".to_string(),
    };

    let permissions = iam_repo.get_permissions_for_role(member.role_id).await.unwrap_or_default();

    let notification_message = format!("{} signed in", login_result.account.email);
    if let Err(e) = db.create_notification(profile.id, "info", &notification_message, Some(org.id)).await {
        tracing::warn!("Failed to create sign-in notification: {:?}", e);
    }

    let _ = db.write_audit_log(
        Some(profile.id), "google_login", "auth",
        None, client_ip(&http_req).as_deref(),
        Some(org.id),
    ).await;

    Ok(HttpResponse::Ok().json(AuthResponse {
        user: UserInfo {
            id: profile.id,
            email: login_result.account.email.clone(),
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            username: profile.username,
            auth_type: format!("{:?}", login_result.account.auth_type).to_lowercase(),
            org_id: org.id,
            org_name: org.name,
            role: role_name,
            permissions,
        },
        access_token: login_result.tokens.access_token.to_string(),
        refresh_token: login_result.tokens.refresh_token.to_string(),
        access_token_expires_at: login_result.tokens.access_token_expires_at,
        refresh_token_expires_at: login_result.tokens.refresh_token_expires_at,
    }))
}

pub async fn refresh_token(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    req: web::Json<RefreshTokenRequest>,
) -> Result<HttpResponse, AppError> {
    let refresh_result = auth_service.refresh(&req.refresh_token).await?;

    let profile = db.get_or_create_profile(
        refresh_result.account.id,
        refresh_result.account.email.clone(),
    ).await?;

    let (org, member) = match db.get_org_for_profile(profile.id).await? {
        Some(om) => om,
        None => {
            let slug_base = refresh_result.account.email.split('@').next().unwrap_or("user");
            let slug = db.generate_unique_slug(slug_base).await?;
            let org_name = format!("{}'s Organization", slug_base);
            let org = db.create_organization(&org_name, &slug).await?;
            let admin_role = iam_repo.get_role_by_name("admin").await
                .map_err(|_| AppError::Internal("Failed to look up admin role".to_string()))?
                .ok_or_else(|| AppError::Internal("Admin role not found".to_string()))?;
            let member = db.add_org_member(org.id, profile.id, admin_role.id).await?;
            (org, member)
        }
    };

    let role_name = match iam_repo.get_role_by_id(member.role_id).await {
        Ok(Some(role)) => role.name,
        _ => "member".to_string(),
    };

    let permissions = iam_repo.get_permissions_for_role(member.role_id).await.unwrap_or_default();

    Ok(HttpResponse::Ok().json(AuthResponse {
        user: UserInfo {
            id: profile.id,
            email: refresh_result.account.email.clone(),
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            username: profile.username,
            auth_type: format!("{:?}", refresh_result.account.auth_type).to_lowercase(),
            org_id: org.id,
            org_name: org.name,
            role: role_name,
            permissions,
        },
        access_token: refresh_result.tokens.access_token.to_string(),
        refresh_token: refresh_result.tokens.refresh_token.to_string(),
        access_token_expires_at: refresh_result.tokens.access_token_expires_at,
        refresh_token_expires_at: refresh_result.tokens.refresh_token_expires_at,
    }))
}

pub async fn logout(
    auth_service: web::Data<Arc<AuthService>>,
    _user: AuthenticatedUser,
    req: web::Json<LogoutRequest>,
) -> Result<HttpResponse, AppError> {
    auth_service.logout(&req.access_token).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Logged out successfully" })))
}

pub async fn get_me(
    auth_service: web::Data<Arc<AuthService>>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let iam_account = auth_service.get_account(user.account_id).await?;
    Ok(HttpResponse::Ok().json(build_user_info(&user, &iam_account)))
}

pub async fn change_password(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<ChangePasswordRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    auth_service
        .change_password(user.account_id, &req.old_password, &req.new_password)
        .await?;

    let _ = db.write_audit_log(
        Some(user.profile.id), "change_password", "auth",
        None, client_ip(&http_req).as_deref(),
        Some(user.org.id),
    ).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Password changed successfully" })))
}

pub async fn delete_account(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<DeleteAccountRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    auth_service
        .delete_account(user.account_id, &req.password)
        .await?;

    let _ = db.write_audit_log(
        None, "delete_account", "auth",
        Some(&user.email), client_ip(&http_req).as_deref(),
        Some(user.org.id),
    ).await;

    if let Err(e) = db.delete_profile_by_iam_id(user.account_id).await {
        tracing::error!("Failed to delete user profile (IAM account already deleted): {:?}", e);
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Account deleted successfully" })))
}

// --------------- Notification handlers ---------------

pub async fn create_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<CreateNotificationRequest>,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "notifications:write")?;

    if !["info", "warning", "error"].contains(&req.level.as_str()) {
        return Err(AppError::BadRequest(
            "Invalid level. Must be 'info', 'warning', or 'error'".to_string(),
        ));
    }

    let notification = db.create_notification(user.profile.id, &req.level, &req.message, Some(user.org.id)).await?;
    Ok(HttpResponse::Created().json(notification))
}

pub async fn get_notifications(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    query: web::Query<PaginationQuery>,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "notifications:read")?;
    let limit = query.limit.unwrap_or(100).min(500);
    let offset = query.offset.unwrap_or(0);
    let page = db.get_notifications_paginated(user.profile.id, user.org.id, limit, offset).await?;
    Ok(HttpResponse::Ok().json(page))
}

pub async fn get_unread_count(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "notifications:read")?;
    let count = db.get_unread_count(user.profile.id, user.org.id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "count": count })))
}

pub async fn update_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    notification_id: web::Path<uuid::Uuid>,
    req: web::Json<UpdateNotificationRequest>,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "notifications:write")?;
    let notification = db.update_notification_read(*notification_id, user.profile.id, req.read).await?;
    Ok(HttpResponse::Ok().json(notification))
}

pub async fn update_notifications_batch(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<BatchUpdateNotificationsRequest>,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "notifications:write")?;
    let notifications = db.update_notifications_read_batch(&req.notification_ids, user.profile.id, req.read).await?;
    Ok(HttpResponse::Ok().json(notifications))
}

pub async fn delete_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    notification_id: web::Path<uuid::Uuid>,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "notifications:write")?;
    db.delete_notification(*notification_id, user.profile.id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Notification deleted successfully" })))
}

pub async fn delete_notifications_batch(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<BatchNotificationIdsRequest>,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "notifications:write")?;
    let count = db.delete_notifications_batch(&req.notification_ids, user.profile.id).await?;
    Ok(HttpResponse::Ok().json(BatchDeleteResponse {
        message: format!("{} notification(s) deleted successfully", count),
        deleted_count: count,
    }))
}

// --------------- Profile settings ---------------

pub async fn get_profile_settings(
    user: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "settings:read")?;
    Ok(HttpResponse::Ok().json(ProfileSettings {
        username: user.profile.username.clone(),
    }))
}

pub async fn update_profile_settings(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<UpdateProfileSettingsRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "settings:write")?;

    if let Some(ref username) = req.username {
        let trimmed = username.trim();
        if trimmed.is_empty() {
            return Err(AppError::BadRequest("Username cannot be empty".to_string()));
        }
        if trimmed.len() > 255 {
            return Err(AppError::BadRequest("Username must be 255 characters or less".to_string()));
        }
    }

    let updated = db.update_profile_settings(user.profile.id, req.username.clone()).await?;

    let _ = db.write_audit_log(
        Some(user.profile.id), "update_settings", "profile",
        None, client_ip(&http_req).as_deref(),
        Some(user.org.id),
    ).await;

    Ok(HttpResponse::Ok().json(ProfileSettings {
        username: updated.username,
    }))
}

// --------------- Audit log ---------------

pub async fn get_audit_log(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    query: web::Query<PaginationQuery>,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "audit_log:read")?;
    let limit = query.limit.unwrap_or(50).min(200);
    let offset = query.offset.unwrap_or(0);
    let page = db.get_audit_log(user.profile.id, user.org.id, limit, offset).await?;
    Ok(HttpResponse::Ok().json(page))
}

// --------------- Organization management ---------------

pub async fn get_org(
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "members:read")?;

    let members_with_profiles = db.get_org_members_with_profiles(user.org.id).await?;

    let mut member_infos = Vec::new();
    for (member, profile) in members_with_profiles {
        let role_name = match iam_repo.get_role_by_id(member.role_id).await {
            Ok(Some(role)) => role.name,
            _ => "member".to_string(),
        };

        let email = match iam_repo.find_account_by_id(profile.iam_account_id).await {
            Ok(Some(acc)) => acc.email,
            _ => profile.display_name.clone().unwrap_or_default(),
        };

        member_infos.push(OrgMemberInfo {
            profile_id: profile.id,
            email,
            display_name: profile.display_name,
            username: profile.username,
            role: role_name,
            joined_at: member.joined_at,
        });
    }

    Ok(HttpResponse::Ok().json(OrgResponse {
        org: user.org.clone(),
        members: member_infos,
    }))
}

pub async fn create_invitation(
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    user: AuthenticatedUser,
    req: web::Json<CreateInvitationRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "members:invite")?;

    let role = iam_repo.get_role_by_name(&req.role).await
        .map_err(|_| AppError::Internal("Failed to look up role".to_string()))?
        .ok_or_else(|| AppError::BadRequest(format!("Invalid role: {}", req.role)))?;

    use rand::Rng;
    let code: String = {
        let mut bytes = [0u8; 16];
        rand::thread_rng().fill(&mut bytes);
        bytes.iter().map(|b| format!("{:02x}", b)).collect()
    };

    let expires_at = chrono::Utc::now() + chrono::Duration::days(7);

    let invitation = db.create_invitation(
        user.org.id, role.id, user.profile.id, &code, expires_at,
    ).await?;

    let _ = db.write_audit_log(
        Some(user.profile.id), "create_invitation", "org",
        Some(&format!("role={}, code={}", req.role, &code[..8])),
        client_ip(&http_req).as_deref(),
        Some(user.org.id),
    ).await;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "id": invitation.id,
        "code": invitation.code,
        "expires_at": invitation.expires_at,
    })))
}

pub async fn list_invitations(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "members:invite")?;
    let invitations = db.list_invitations(user.org.id).await?;
    Ok(HttpResponse::Ok().json(invitations))
}

pub async fn revoke_invitation(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    invitation_id: web::Path<uuid::Uuid>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "members:invite")?;
    db.delete_invitation(*invitation_id, user.org.id).await?;

    let _ = db.write_audit_log(
        Some(user.profile.id), "revoke_invitation", "org",
        Some(&invitation_id.to_string()),
        client_ip(&http_req).as_deref(),
        Some(user.org.id),
    ).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Invitation revoked" })))
}

pub async fn get_invitation_info(
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    code: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let invitation = db.get_invitation_by_code(&code).await?
        .ok_or_else(|| AppError::NotFound("Invitation not found or expired".to_string()))?;

    let org = db.get_organization_by_id(invitation.org_id).await?
        .ok_or_else(|| AppError::Internal("Organization not found".to_string()))?;

    let role_name = match iam_repo.get_role_by_id(invitation.role_id).await {
        Ok(Some(role)) => role.name,
        _ => "member".to_string(),
    };

    Ok(HttpResponse::Ok().json(OrgInvitationInfo {
        code: invitation.code,
        org_name: org.name,
        role: role_name,
        expires_at: invitation.expires_at,
    }))
}


pub async fn remove_member(
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    user: AuthenticatedUser,
    profile_id: web::Path<uuid::Uuid>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "members:remove")?;

    if *profile_id == user.profile.id {
        return Err(AppError::BadRequest("Cannot remove yourself from the organization".to_string()));
    }

    let target_profile = db.get_profile_by_id(*profile_id).await?
        .ok_or_else(|| AppError::NotFound("User profile not found".to_string()))?;

    let _ = db.write_audit_log(
        Some(user.profile.id), "remove_member", "org",
        Some(&format!("profile_id={}, iam_id={}", profile_id, target_profile.iam_account_id)),
        client_ip(&http_req).as_deref(),
        Some(user.org.id),
    ).await;

    let now = chrono::Utc::now();
    if let Err(e) = iam_repo.revoke_all_tokens(target_profile.iam_account_id, now).await {
        tracing::error!("Failed to revoke tokens for removed member: {:?}", e);
    }
    if let Err(e) = iam_repo.delete_account(target_profile.iam_account_id, now).await {
        tracing::error!("Failed to soft-delete IAM account for removed member: {:?}", e);
    }

    db.delete_profile(target_profile.id).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Member removed and account deleted" })))
}

pub async fn update_member_role(
    db: web::Data<DbContext>,
    iam_repo: web::Data<Repo>,
    user: AuthenticatedUser,
    profile_id: web::Path<uuid::Uuid>,
    req: web::Json<UpdateMemberRoleRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    require_permission(&user, "members:remove")?;

    if *profile_id == user.profile.id {
        return Err(AppError::BadRequest("Cannot change your own role".to_string()));
    }

    let role = iam_repo.get_role_by_name(&req.role).await
        .map_err(|_| AppError::Internal("Failed to look up role".to_string()))?
        .ok_or_else(|| AppError::BadRequest(format!("Invalid role: {}", req.role)))?;

    db.update_member_role(user.org.id, *profile_id, role.id).await?;

    let _ = db.write_audit_log(
        Some(user.profile.id), "update_member_role", "org",
        Some(&format!("{} -> {}", profile_id, req.role)),
        client_ip(&http_req).as_deref(),
        Some(user.org.id),
    ).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Member role updated successfully" })))
}

// --------------- Config / Health ---------------

pub async fn get_google_oauth_config(
    config: web::Data<AppConfig>,
) -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "enabled": config.google_oauth_client_id.is_some(),
        "client_id": config.google_oauth_client_id,
    }))
}

pub async fn health_check(
    db: web::Data<DbContext>,
) -> HttpResponse {
    let (iam_ok, app_ok) = db.health_check().await;
    let overall = if iam_ok && app_ok { "healthy" } else { "degraded" };
    let status_code = if iam_ok && app_ok {
        actix_web::http::StatusCode::OK
    } else {
        actix_web::http::StatusCode::SERVICE_UNAVAILABLE
    };
    HttpResponse::build(status_code).json(HealthResponse {
        status: overall.to_string(),
        iam_db: if iam_ok { "ok".to_string() } else { "error".to_string() },
        app_db: if app_ok { "ok".to_string() } else { "error".to_string() },
    })
}
