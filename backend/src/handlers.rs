use actix_web::{web, HttpResponse, Responder};
use nano_iam::{AuthService, AuthType, IamError};
use std::sync::Arc;
use std::env;

use crate::auth::AuthenticatedUser;
use crate::dba::DbContext;
use crate::models::{
    AuthResponse, ChangePasswordRequest, CreateNotificationRequest, DeleteAccountRequest,
    GoogleLoginRequest, LoginRequest, PaginationQuery, ProfileSettings, RefreshTokenRequest,
    SignupRequest, SignupResponse, UpdateNotificationRequest, UpdateProfileSettingsRequest,
    UserInfo, UserProfile,
};

/// Build a UserInfo DTO from a UserProfile and a nano-iam Account.
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

/// Resolve the UserProfile for an authenticated user, returning an HTTP error response on failure.
async fn get_profile_or_error(
    db: &DbContext,
    user: &AuthenticatedUser,
) -> Result<UserProfile, HttpResponse> {
    match db.get_profile_by_iam_id(user.account_id).await {
        Ok(Some(p)) => Ok(p),
        Ok(None) => Err(HttpResponse::NotFound().json(serde_json::json!({
            "error": "User profile not found"
        }))),
        Err(e) => {
            log::error!("Failed to get user profile: {:?}", e);
            Err(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get user profile"
            })))
        }
    }
}

pub async fn signup(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    req: web::Json<SignupRequest>,
) -> impl Responder {
    let iam_account = match auth_service.register(&req.email, &req.password).await {
        Ok(account) => account,
        Err(IamError::Db(sqlx::Error::Database(db_err))) if db_err.constraint() == Some("accounts_email_key") => {
            return HttpResponse::Conflict().json(serde_json::json!({
                "error": "Email already exists"
            }));
        }
        Err(IamError::WeakPassword(msg)) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": msg
            }));
        }
        Err(e) => {
            log::error!("Signup error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create account"
            }));
        }
    };

    if let Err(e) = db.create_profile(iam_account.id, iam_account.email.clone()).await {
        log::error!("Failed to create user profile: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to create account"
        }));
    }

    HttpResponse::Ok().json(SignupResponse {
        account_id: iam_account.id,
        email: iam_account.email,
        message: "Account created. Please check your email for verification code.".to_string(),
    })
}

pub async fn verify_email(
    auth_service: web::Data<Arc<AuthService>>,
    req: web::Json<VerifyEmailRequest>,
) -> impl Responder {
    match auth_service
        .verify_email(req.account_id, &req.code)
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Email verified successfully"
        })),
        Err(IamError::InvalidVerificationCode) => {
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid verification code"
            }))
        }
        Err(IamError::VerificationCodeExpired) => {
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Verification code expired. Please request a new one."
            }))
        }
        Err(e) => {
            log::error!("Email verification error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify email"
            }))
        }
    }
}

pub async fn resend_verification(
    auth_service: web::Data<Arc<AuthService>>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let email = match req.get("email").and_then(|v| v.as_str()) {
        Some(e) => e,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Email required"
            }));
        }
    };

    match auth_service.resend_verification_email(email).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Verification email sent"
        })),
        Err(IamError::AccountNotFound) => {
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }))
        }
        Err(IamError::EmailAlreadyVerified) => {
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Email already verified"
            }))
        }
        Err(e) => {
            log::error!("Resend verification error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to resend verification email"
            }))
        }
    }
}

pub async fn login(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    req: web::Json<LoginRequest>,
) -> impl Responder {
    let login_result = match auth_service
        .login_with_auth_type(&req.email, &req.password, AuthType::Email)
        .await
    {
        Ok(result) => result,
        Err(IamError::InvalidCredentials) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid email or password"
            }));
        }
        Err(IamError::EmailNotVerified) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Email not verified. Please check your email for verification code."
            }));
        }
        Err(e) => {
            log::error!("Login error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Login failed"
            }));
        }
    };

    let profile = match db.get_or_create_profile(
        login_result.account.id,
        login_result.account.email.clone(),
    ).await {
        Ok(p) => p,
        Err(e) => {
            log::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    let notification_message = format!("{} signed in", login_result.account.email);
    if let Err(e) = db.create_notification(profile.id, "info", &notification_message).await {
        log::warn!("Failed to create sign-in notification: {:?}", e);
    }

    HttpResponse::Ok().json(AuthResponse {
        user: build_user_info(&profile, &login_result.account),
        access_token: login_result.tokens.access_token.to_string(),
        refresh_token: login_result.tokens.refresh_token.to_string(),
        access_token_expires_at: login_result.tokens.access_token_expires_at,
        refresh_token_expires_at: login_result.tokens.refresh_token_expires_at,
    })
}

pub async fn google_login(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    req: web::Json<GoogleLoginRequest>,
) -> impl Responder {
    let login_result = match auth_service
        .login_with_auth_type("", &req.id_token, AuthType::Google)
        .await
    {
        Ok(result) => result,
        Err(IamError::InvalidOAuthToken) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid Google token"
            }));
        }
        Err(IamError::OAuthEmailNotVerified) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Google account email is not verified"
            }));
        }
        Err(IamError::AuthTypeMismatch) => {
            return HttpResponse::Conflict().json(serde_json::json!({
                "error": "This email is already registered with a different authentication method"
            }));
        }
        Err(IamError::InvalidCredentials) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid Google token"
            }));
        }
        Err(IamError::EmailNotVerified) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Email not verified"
            }));
        }
        Err(e) => {
            log::error!("Google login error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Google login failed"
            }));
        }
    };

    let profile = match db.get_or_create_profile(
        login_result.account.id,
        login_result.account.email.clone(),
    ).await {
        Ok(p) => p,
        Err(e) => {
            log::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    let notification_message = format!("{} signed in", login_result.account.email);
    if let Err(e) = db.create_notification(profile.id, "info", &notification_message).await {
        log::warn!("Failed to create sign-in notification: {:?}", e);
    }

    HttpResponse::Ok().json(AuthResponse {
        user: build_user_info(&profile, &login_result.account),
        access_token: login_result.tokens.access_token.to_string(),
        refresh_token: login_result.tokens.refresh_token.to_string(),
        access_token_expires_at: login_result.tokens.access_token_expires_at,
        refresh_token_expires_at: login_result.tokens.refresh_token_expires_at,
    })
}

pub async fn refresh_token(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    req: web::Json<RefreshTokenRequest>,
) -> impl Responder {
    let refresh_result = match auth_service.refresh(&req.refresh_token).await {
        Ok(result) => result,
        Err(IamError::TokenExpired) | Err(IamError::TokenNotFound) | Err(IamError::TokenRevoked) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid or expired refresh token"
            }));
        }
        Err(IamError::TokenReuseDetected) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Refresh token has been compromised"
            }));
        }
        Err(e) => {
            log::error!("Token refresh error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to refresh token"
            }));
        }
    };

    let profile = match db.get_profile_by_iam_id(refresh_result.account.id).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "User profile not found"
            }));
        }
        Err(e) => {
            log::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    HttpResponse::Ok().json(AuthResponse {
        user: build_user_info(&profile, &refresh_result.account),
        access_token: refresh_result.tokens.access_token.to_string(),
        refresh_token: refresh_result.tokens.refresh_token.to_string(),
        access_token_expires_at: refresh_result.tokens.access_token_expires_at,
        refresh_token_expires_at: refresh_result.tokens.refresh_token_expires_at,
    })
}

pub async fn logout(
    auth_service: web::Data<Arc<AuthService>>,
    _user: AuthenticatedUser,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let access_token = req
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Access token required"
        })));

    let token = match access_token {
        Ok(t) if !t.is_empty() => t,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Access token required"
            }));
        }
    };

    match auth_service.logout(token).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Logged out successfully"
        })),
        Err(e) => {
            log::error!("Logout error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Logout failed"
            }))
        }
    }
}

pub async fn get_me(
    db: web::Data<DbContext>,
    auth_service: web::Data<Arc<AuthService>>,
    user: AuthenticatedUser,
) -> impl Responder {
    let iam_account = match auth_service.get_account(user.account_id).await {
        Ok(acc) => acc,
        Err(e) => {
            log::error!("Failed to get IAM account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    let profile = match db.get_profile_by_iam_id(user.account_id).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "User profile not found"
            }));
        }
        Err(e) => {
            log::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    HttpResponse::Ok().json(build_user_info(&profile, &iam_account))
}

pub async fn change_password(
    auth_service: web::Data<Arc<AuthService>>,
    user: AuthenticatedUser,
    req: web::Json<ChangePasswordRequest>,
) -> impl Responder {
    match auth_service
        .change_password(user.account_id, &req.old_password, &req.new_password)
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Password changed successfully"
        })),
        Err(IamError::InvalidCredentials) => {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid current password"
            }))
        }
        Err(IamError::WeakPassword(msg)) => {
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": msg
            }))
        }
        Err(e) => {
            log::error!("Change password error: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to change password"
            }))
        }
    }
}

pub async fn delete_account(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<DeleteAccountRequest>,
) -> impl Responder {
    match auth_service
        .delete_account(user.account_id, &req.password)
        .await
    {
        Ok(_) => {}
        Err(IamError::InvalidCredentials) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid password"
            }));
        }
        Err(e) => {
            log::error!("Delete account error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to delete account"
            }));
        }
    };

    if let Err(e) = db.delete_profile_by_iam_id(user.account_id).await {
        log::error!("Failed to delete user profile (IAM account already deleted): {:?}", e);
    }

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Account deleted successfully"
    }))
}

// Notification handlers

pub async fn create_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<CreateNotificationRequest>,
) -> impl Responder {
    if !["info", "warning", "error"].contains(&req.level.as_str()) {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid level. Must be 'info', 'warning', or 'error'"
        }));
    }

    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    match db.create_notification(profile.id, &req.level, &req.message).await {
        Ok(notification) => HttpResponse::Created().json(notification),
        Err(e) => {
            log::error!("Failed to create notification: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create notification"
            }))
        }
    }
}

pub async fn get_notifications(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    query: web::Query<PaginationQuery>,
) -> impl Responder {
    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    let limit = query.limit.unwrap_or(100).min(500);
    let offset = query.offset.unwrap_or(0);

    match db.get_notifications(profile.id, limit, offset).await {
        Ok(notifications) => HttpResponse::Ok().json(notifications),
        Err(e) => {
            log::error!("Failed to get notifications: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get notifications"
            }))
        }
    }
}

pub async fn get_unread_count(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
) -> impl Responder {
    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    match db.get_unread_count(profile.id).await {
        Ok(count) => HttpResponse::Ok().json(serde_json::json!({
            "count": count
        })),
        Err(e) => {
            log::error!("Failed to get unread count: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get unread count"
            }))
        }
    }
}

pub async fn update_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    notification_id: web::Path<uuid::Uuid>,
    req: web::Json<UpdateNotificationRequest>,
) -> impl Responder {
    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    match db.update_notification_read(*notification_id, profile.id, req.read).await {
        Ok(notification) => HttpResponse::Ok().json(notification),
        Err(sqlx::Error::RowNotFound) => {
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Notification not found"
            }))
        }
        Err(e) => {
            log::error!("Failed to update notification: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update notification"
            }))
        }
    }
}

pub async fn update_notifications_batch(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    let notification_ids: Vec<uuid::Uuid> = match req["notification_ids"].as_array() {
        Some(arr) => {
            arr.iter()
                .filter_map(|v| v.as_str().and_then(|s| uuid::Uuid::parse_str(s).ok()))
                .collect()
        }
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "notification_ids array is required"
            }));
        }
    };

    let read = match req["read"].as_bool() {
        Some(v) => v,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "read boolean is required"
            }));
        }
    };

    match db.update_notifications_read_batch(&notification_ids, profile.id, read).await {
        Ok(notifications) => HttpResponse::Ok().json(notifications),
        Err(e) => {
            log::error!("Failed to update notifications: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update notifications"
            }))
        }
    }
}

pub async fn delete_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    notification_id: web::Path<uuid::Uuid>,
) -> impl Responder {
    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    match db.delete_notification(*notification_id, profile.id).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Notification deleted successfully"
        })),
        Err(e) => {
            log::error!("Failed to delete notification: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to delete notification"
            }))
        }
    }
}

pub async fn delete_notifications_batch(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    let notification_ids: Vec<uuid::Uuid> = match req["notification_ids"].as_array() {
        Some(arr) => {
            arr.iter()
                .filter_map(|v| v.as_str().and_then(|s| uuid::Uuid::parse_str(s).ok()))
                .collect()
        }
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "notification_ids array is required"
            }));
        }
    };

    match db.delete_notifications_batch(&notification_ids, profile.id).await {
        Ok(count) => HttpResponse::Ok().json(serde_json::json!({
            "message": format!("{} notification(s) deleted successfully", count),
            "deleted_count": count
        })),
        Err(e) => {
            log::error!("Failed to delete notifications: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to delete notifications"
            }))
        }
    }
}

// Profile settings handlers

pub async fn get_profile_settings(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
) -> impl Responder {
    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    HttpResponse::Ok().json(ProfileSettings {
        username: profile.username,
    })
}

pub async fn update_profile_settings(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<UpdateProfileSettingsRequest>,
) -> impl Responder {
    let profile = match get_profile_or_error(&db, &user).await {
        Ok(p) => p,
        Err(resp) => return resp,
    };

    if let Some(ref username) = req.username {
        let trimmed = username.trim();
        if trimmed.is_empty() {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Username cannot be empty"
            }));
        }
        if trimmed.len() > 255 {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Username must be 255 characters or less"
            }));
        }
    }

    match db.update_profile_settings(profile.id, req.username.clone()).await {
        Ok(updated) => HttpResponse::Ok().json(ProfileSettings {
            username: updated.username,
        }),
        Err(e) => {
            log::error!("Failed to update profile settings: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update profile settings"
            }))
        }
    }
}

pub async fn get_google_oauth_config() -> impl Responder {
    let client_id = env::var("GOOGLE_OAUTH_CLIENT_ID").unwrap_or_default();

    HttpResponse::Ok().json(serde_json::json!({
        "enabled": !client_id.is_empty(),
        "client_id": if !client_id.is_empty() { Some(client_id) } else { None }
    }))
}

use crate::models::VerifyEmailRequest;
