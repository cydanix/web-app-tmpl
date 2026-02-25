use actix_web::{web, HttpRequest, HttpResponse};
use nano_iam::{AuthService, AuthType, IamError};
use std::sync::Arc;

use crate::auth::AuthenticatedUser;
use crate::config::AppConfig;
use crate::dba::DbContext;
use crate::errors::AppError;
use crate::models::{
    AuthResponse, BatchDeleteResponse, BatchNotificationIdsRequest,
    BatchUpdateNotificationsRequest, ChangePasswordRequest, CreateNotificationRequest,
    DeleteAccountRequest, GoogleLoginRequest, HealthResponse, LoginRequest, LogoutRequest,
    PaginationQuery, ProfileSettings, RefreshTokenRequest, ResendVerificationRequest,
    SignupRequest, SignupResponse, UpdateNotificationRequest, UpdateProfileSettingsRequest,
    UserInfo, UserProfile, VerifyEmailRequest,
};

fn build_user_info(profile: &UserProfile, iam: &nano_iam::Account) -> UserInfo {
    UserInfo {
        id: profile.id,
        email: iam.email.clone(),
        display_name: profile.display_name.clone(),
        avatar_url: profile.avatar_url.clone(),
        username: profile.username.clone(),
        auth_type: format!("{:?}", iam.auth_type).to_lowercase(),
    }
}

async fn get_profile_or_error(
    db: &DbContext,
    user: &AuthenticatedUser,
) -> Result<UserProfile, AppError> {
    db.get_profile_by_iam_id(user.account_id)
        .await?
        .ok_or_else(|| AppError::NotFound("User profile not found".to_string()))
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

    db.create_profile(iam_account.id, iam_account.email.clone()).await?;

    let _ = db.write_audit_log(
        None, "signup", "auth",
        Some(&iam_account.email), client_ip(&http_req).as_deref(),
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

    let notification_message = format!("{} signed in", login_result.account.email);
    if let Err(e) = db.create_notification(profile.id, "info", &notification_message).await {
        tracing::warn!("Failed to create sign-in notification: {:?}", e);
    }

    let _ = db.write_audit_log(
        Some(profile.id), "login", "auth",
        None, client_ip(&http_req).as_deref(),
    ).await;

    Ok(HttpResponse::Ok().json(AuthResponse {
        user: build_user_info(&profile, &login_result.account),
        access_token: login_result.tokens.access_token.to_string(),
        refresh_token: login_result.tokens.refresh_token.to_string(),
        access_token_expires_at: login_result.tokens.access_token_expires_at,
        refresh_token_expires_at: login_result.tokens.refresh_token_expires_at,
    }))
}

pub async fn google_login(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
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

    let notification_message = format!("{} signed in", login_result.account.email);
    if let Err(e) = db.create_notification(profile.id, "info", &notification_message).await {
        tracing::warn!("Failed to create sign-in notification: {:?}", e);
    }

    let _ = db.write_audit_log(
        Some(profile.id), "google_login", "auth",
        None, client_ip(&http_req).as_deref(),
    ).await;

    Ok(HttpResponse::Ok().json(AuthResponse {
        user: build_user_info(&profile, &login_result.account),
        access_token: login_result.tokens.access_token.to_string(),
        refresh_token: login_result.tokens.refresh_token.to_string(),
        access_token_expires_at: login_result.tokens.access_token_expires_at,
        refresh_token_expires_at: login_result.tokens.refresh_token_expires_at,
    }))
}

pub async fn refresh_token(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    req: web::Json<RefreshTokenRequest>,
) -> Result<HttpResponse, AppError> {
    let refresh_result = auth_service.refresh(&req.refresh_token).await?;

    let profile = db.get_profile_by_iam_id(refresh_result.account.id)
        .await?
        .ok_or_else(|| AppError::NotFound("User profile not found".to_string()))?;

    Ok(HttpResponse::Ok().json(AuthResponse {
        user: build_user_info(&profile, &refresh_result.account),
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
    db: web::Data<DbContext>,
    auth_service: web::Data<Arc<AuthService>>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let iam_account = auth_service.get_account(user.account_id).await?;
    let profile = get_profile_or_error(&db, &user).await?;
    Ok(HttpResponse::Ok().json(build_user_info(&profile, &iam_account)))
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

    if let Ok(Some(profile)) = db.get_profile_by_iam_id(user.account_id).await {
        let _ = db.write_audit_log(
            Some(profile.id), "change_password", "auth",
            None, client_ip(&http_req).as_deref(),
        ).await;
    }

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
    if !["info", "warning", "error"].contains(&req.level.as_str()) {
        return Err(AppError::BadRequest(
            "Invalid level. Must be 'info', 'warning', or 'error'".to_string(),
        ));
    }

    let profile = get_profile_or_error(&db, &user).await?;
    let notification = db.create_notification(profile.id, &req.level, &req.message).await?;
    Ok(HttpResponse::Created().json(notification))
}

pub async fn get_notifications(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    query: web::Query<PaginationQuery>,
) -> Result<HttpResponse, AppError> {
    let profile = get_profile_or_error(&db, &user).await?;
    let limit = query.limit.unwrap_or(100).min(500);
    let offset = query.offset.unwrap_or(0);
    let page = db.get_notifications_paginated(profile.id, limit, offset).await?;
    Ok(HttpResponse::Ok().json(page))
}

pub async fn get_unread_count(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let profile = get_profile_or_error(&db, &user).await?;
    let count = db.get_unread_count(profile.id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "count": count })))
}

pub async fn update_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    notification_id: web::Path<uuid::Uuid>,
    req: web::Json<UpdateNotificationRequest>,
) -> Result<HttpResponse, AppError> {
    let profile = get_profile_or_error(&db, &user).await?;
    let notification = db.update_notification_read(*notification_id, profile.id, req.read).await?;
    Ok(HttpResponse::Ok().json(notification))
}

pub async fn update_notifications_batch(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<BatchUpdateNotificationsRequest>,
) -> Result<HttpResponse, AppError> {
    let profile = get_profile_or_error(&db, &user).await?;
    let notifications = db.update_notifications_read_batch(&req.notification_ids, profile.id, req.read).await?;
    Ok(HttpResponse::Ok().json(notifications))
}

pub async fn delete_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    notification_id: web::Path<uuid::Uuid>,
) -> Result<HttpResponse, AppError> {
    let profile = get_profile_or_error(&db, &user).await?;
    db.delete_notification(*notification_id, profile.id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "message": "Notification deleted successfully" })))
}

pub async fn delete_notifications_batch(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<BatchNotificationIdsRequest>,
) -> Result<HttpResponse, AppError> {
    let profile = get_profile_or_error(&db, &user).await?;
    let count = db.delete_notifications_batch(&req.notification_ids, profile.id).await?;
    Ok(HttpResponse::Ok().json(BatchDeleteResponse {
        message: format!("{} notification(s) deleted successfully", count),
        deleted_count: count,
    }))
}

// --------------- Profile settings ---------------

pub async fn get_profile_settings(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
) -> Result<HttpResponse, AppError> {
    let profile = get_profile_or_error(&db, &user).await?;
    Ok(HttpResponse::Ok().json(ProfileSettings {
        username: profile.username,
    }))
}

pub async fn update_profile_settings(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<UpdateProfileSettingsRequest>,
    http_req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let profile = get_profile_or_error(&db, &user).await?;

    if let Some(ref username) = req.username {
        let trimmed = username.trim();
        if trimmed.is_empty() {
            return Err(AppError::BadRequest("Username cannot be empty".to_string()));
        }
        if trimmed.len() > 255 {
            return Err(AppError::BadRequest("Username must be 255 characters or less".to_string()));
        }
    }

    let updated = db.update_profile_settings(profile.id, req.username.clone()).await?;

    let _ = db.write_audit_log(
        Some(profile.id), "update_settings", "profile",
        None, client_ip(&http_req).as_deref(),
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
    let profile = get_profile_or_error(&db, &user).await?;
    let limit = query.limit.unwrap_or(50).min(200);
    let offset = query.offset.unwrap_or(0);
    let page = db.get_audit_log(profile.id, limit, offset).await?;
    Ok(HttpResponse::Ok().json(page))
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
