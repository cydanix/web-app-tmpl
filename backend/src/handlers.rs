use actix_web::{web, HttpResponse, Responder};
use chrono::Utc;
use nano_iam::{AuthService, AuthType, IamError};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::AuthenticatedUser;
use crate::models::{
    Account, AccountInfo, AuthResponse, ChangePasswordRequest, DeleteAccountRequest,
    GoogleLoginRequest, LoginRequest, RefreshTokenRequest, SignupRequest, SignupResponse,
    VerifyEmailRequest,
};

pub async fn signup(
    auth_service: web::Data<Arc<AuthService>>,
    db: web::Data<PgPool>,
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
    let _account = match sqlx::query_as::<_, Account>(
        r#"
        INSERT INTO app_accounts (id, iam_account_id, display_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $4)
        RETURNING id, iam_account_id, display_name, avatar_url, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(iam_account.id)
    .bind(iam_account.email.clone())
    .bind(Utc::now())
    .fetch_one(db.get_ref())
    .await
    {
        Ok(acc) => acc,
        Err(e) => {
            log::error!("Failed to create account record: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create account"
            }));
        }
    };

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
    db: web::Data<PgPool>,
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

    // Get our Account record
    let account = match sqlx::query_as::<_, Account>(
        r#"
        SELECT id, iam_account_id, display_name, avatar_url, created_at, updated_at
        FROM app_accounts
        WHERE iam_account_id = $1
        "#,
    )
    .bind(login_result.account.id)
    .fetch_optional(db.get_ref())
    .await
    {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            // Account doesn't exist in our table, create it
            match sqlx::query_as::<_, Account>(
                r#"
                INSERT INTO app_accounts (id, iam_account_id, display_name, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $4)
                RETURNING id, iam_account_id, display_name, avatar_url, created_at, updated_at
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(login_result.account.id)
            .bind(login_result.account.email.clone())
            .bind(Utc::now())
            .fetch_one(db.get_ref())
            .await
            {
                Ok(acc) => acc,
                Err(e) => {
                    log::error!("Failed to create account record: {:?}", e);
                    return HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to create account"
                    }));
                }
            }
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
            email: login_result.account.email,
            display_name: account.display_name,
            avatar_url: account.avatar_url,
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
    db: web::Data<PgPool>,
    req: web::Json<GoogleLoginRequest>,
) -> impl Responder {
    let login_result = match auth_service
        .login_with_auth_type("", &req.id_token, AuthType::Google)
        .await
    {
        Ok(result) => result,
        Err(IamError::InvalidCredentials) => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Invalid Google token"
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
    let account = match sqlx::query_as::<_, Account>(
        r#"
        SELECT id, iam_account_id, display_name, avatar_url, created_at, updated_at
        FROM app_accounts
        WHERE iam_account_id = $1
        "#,
    )
    .bind(login_result.account.id)
    .fetch_optional(db.get_ref())
    .await
    {
        Ok(Some(acc)) => acc,
        Ok(None) => {
            // Account doesn't exist in our table, create it
            match sqlx::query_as::<_, Account>(
                r#"
                INSERT INTO app_accounts (id, iam_account_id, display_name, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $4)
                RETURNING id, iam_account_id, display_name, avatar_url, created_at, updated_at
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(login_result.account.id)
            .bind(login_result.account.email.clone())
            .bind(Utc::now())
            .fetch_one(db.get_ref())
            .await
            {
                Ok(acc) => acc,
                Err(e) => {
                    log::error!("Failed to create account record: {:?}", e);
                    return HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to create account"
                    }));
                }
            }
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
            email: login_result.account.email,
            display_name: account.display_name,
            avatar_url: account.avatar_url,
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
    db: web::Data<PgPool>,
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
    let account = match sqlx::query_as::<_, Account>(
        r#"
        SELECT id, iam_account_id, display_name, avatar_url, created_at, updated_at
        FROM app_accounts
        WHERE iam_account_id = $1
        "#,
    )
    .bind(refresh_result.account.id)
    .fetch_optional(db.get_ref())
    .await
    {
        Ok(Some(acc)) => acc,
        Ok(None) | Err(_) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
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
    db: web::Data<PgPool>,
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
    let account = match sqlx::query_as::<_, Account>(
        r#"
        SELECT id, iam_account_id, display_name, avatar_url, created_at, updated_at
        FROM app_accounts
        WHERE iam_account_id = $1
        "#,
    )
    .bind(user.account_id)
    .fetch_optional(db.get_ref())
    .await
    {
        Ok(Some(acc)) => acc,
        Ok(None) | Err(_) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Account not found"
            }));
        }
    };

    HttpResponse::Ok().json(AccountInfo {
        id: account.id,
        iam_account_id: account.iam_account_id,
        email: iam_account.email,
        display_name: account.display_name,
        avatar_url: account.avatar_url,
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
    db: web::Data<PgPool>,
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
    match sqlx::query(
        r#"
        DELETE FROM app_accounts
        WHERE iam_account_id = $1
        "#,
    )
    .bind(user.account_id)
    .execute(db.get_ref())
    .await
    {
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
