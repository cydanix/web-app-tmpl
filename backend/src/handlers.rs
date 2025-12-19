use actix_web::{web, HttpResponse, Responder};
use nano_iam::{AuthService, AuthType, IamError};
use std::sync::Arc;
use std::env;

use crate::auth::AuthenticatedUser;
use crate::dba::DbContext;
use crate::models::{
    AccountInfo, AccountSettings, AuthResponse, ChangePasswordRequest,
    CreateNotificationRequest, DeleteAccountRequest, GoogleLoginRequest, LoginRequest,
    RefreshTokenRequest, SignupRequest, SignupResponse, UpdateAccountSettingsRequest,
    UpdateNotificationRequest, VerifyEmailRequest,
};

pub async fn signup(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<DbContext>,
    req: web::Json<SignupRequest>,
) -> impl Responder {
    // Register with IAM
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

    // Create our Account record linked to IAM account
    if let Err(e) = db.create_account(
        iam_account.id,
        iam_account.email.clone(),
    )
    .await
    {
        log::error!("Failed to create account record: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to create account"
        }));
    }

    // Return signup response without tokens - user needs to verify email first
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

    // Get our Account record, or create it if it doesn't exist
    let account = match db.get_or_create_account_by_iam_id(
        login_result.account.id,
        login_result.account.email.clone(),
    )
    .await
    {
        Ok(acc) => acc,
        Err(e) => {
            log::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    // Create sign-in notification
    let notification_message = format!("{} signed in", login_result.account.email);
    if let Err(e) = db
        .create_notification(account.id, "info", &notification_message)
        .await
    {
        // Log error but don't fail the login
        log::warn!("Failed to create sign-in notification: {:?}", e);
    }

    HttpResponse::Ok().json(AuthResponse {
        account: AccountInfo {
            id: account.id,
            iam_account_id: account.iam_account_id,
            email: login_result.account.email,
            display_name: account.display_name,
            avatar_url: account.avatar_url,
            username: account.username,
            auth_type: format!("{:?}", login_result.account.auth_type).to_lowercase(),
        },
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

    // Get or create our Account record
    let account = match db.get_or_create_account_by_iam_id(
        login_result.account.id,
        login_result.account.email.clone(),
    )
    .await
    {
        Ok(acc) => acc,
        Err(e) => {
            log::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    // Create sign-in notification
    let notification_message = format!("{} signed in", login_result.account.email);
    if let Err(e) = db
        .create_notification(account.id, "info", &notification_message)
        .await
    {
        // Log error but don't fail the login
        log::warn!("Failed to create sign-in notification: {:?}", e);
    }

    HttpResponse::Ok().json(AuthResponse {
        account: AccountInfo {
            id: account.id,
            iam_account_id: account.iam_account_id,
            email: login_result.account.email,
            display_name: account.display_name,
            avatar_url: account.avatar_url,
            username: account.username,
            auth_type: format!("{:?}", login_result.account.auth_type).to_lowercase(),
        },
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

    // Get our Account record
    let account = match db.get_account_by_iam_id(refresh_result.account.id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
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
        account: AccountInfo {
            id: account.id,
            iam_account_id: account.iam_account_id,
            email: refresh_result.account.email,
            display_name: account.display_name,
            avatar_url: account.avatar_url,
            username: account.username,
            auth_type: format!("{:?}", refresh_result.account.auth_type).to_lowercase(),
        },
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
    // Get IAM account info
    let iam_account = match auth_service.get_account(user.account_id).await {
        Ok(acc) => acc,
        Err(e) => {
            log::error!("Failed to get IAM account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    // Get our Account record
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Database error: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database error"
            }));
        }
    };

    HttpResponse::Ok().json(AccountInfo {
        id: account.id,
        iam_account_id: account.iam_account_id,
        email: iam_account.email,
        display_name: account.display_name,
        avatar_url: account.avatar_url,
        username: account.username,
        auth_type: format!("{:?}", iam_account.auth_type).to_lowercase(),
    })
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
    // Delete IAM account (soft delete)
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

    // Delete our Account record
    match db.delete_account_by_iam_id(user.account_id).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Account deleted successfully"
        })),
        Err(e) => {
            log::error!("Failed to delete account record: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to delete account"
            }))
        }
    }
}

// Notification handlers

pub async fn create_notification(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<CreateNotificationRequest>,
) -> impl Responder {
    // Validate level
    if !["info", "warning", "error"].contains(&req.level.as_str()) {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid level. Must be 'info', 'warning', or 'error'"
        }));
    }

    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    // Use authenticated user's account_id (ignore account_id from request for security)
    match db
        .create_notification(account.id, &req.level, &req.message)
        .await
    {
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
) -> impl Responder {
    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    match db.get_notifications(account.id).await {
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
    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    match db.get_unread_count(account.id).await {
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
    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    match db
        .update_notification_read(*notification_id, account.id, req.read)
        .await
    {
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
    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
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

    let read = req["read"]
        .as_bool()
        .ok_or_else(|| {
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "read boolean is required"
            }))
        })
        .unwrap();

    match db
        .update_notifications_read_batch(&notification_ids, account.id, read)
        .await
    {
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
    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    match db.delete_notification(*notification_id, account.id).await {
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
    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
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

    match db
        .delete_notifications_batch(&notification_ids, account.id)
        .await
    {
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

// Account settings handlers

pub async fn get_account_settings(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
) -> impl Responder {
    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    HttpResponse::Ok().json(AccountSettings {
        username: account.username,
    })
}

pub async fn update_account_settings(
    db: web::Data<DbContext>,
    user: AuthenticatedUser,
    req: web::Json<UpdateAccountSettingsRequest>,
) -> impl Responder {
    // Get account by IAM ID
    let account = match db.get_account_by_iam_id(user.account_id).await {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to get account: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get account"
            }));
        }
    };

    // Validate username if provided
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

    match db
        .update_account_settings(account.id, req.username.clone())
        .await
    {
        Ok(updated_account) => HttpResponse::Ok().json(AccountSettings {
            username: updated_account.username,
        }),
        Err(e) => {
            log::error!("Failed to update account settings: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update account settings"
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
