use actix_web::{HttpResponse, ResponseError};
use nano_iam::IamError;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    Unauthorized(String),
    Conflict(String),
    Db(sqlx::Error),
    Iam(IamError),
    Internal(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "{}", msg),
            AppError::BadRequest(msg) => write!(f, "{}", msg),
            AppError::Unauthorized(msg) => write!(f, "{}", msg),
            AppError::Conflict(msg) => write!(f, "{}", msg),
            AppError::Db(e) => write!(f, "Database error: {}", e),
            AppError::Iam(e) => write!(f, "IAM error: {}", e),
            AppError::Internal(msg) => write!(f, "{}", msg),
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let (status, message) = match self {
            AppError::NotFound(msg) => (actix_web::http::StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (actix_web::http::StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Unauthorized(msg) => (actix_web::http::StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::Conflict(msg) => (actix_web::http::StatusCode::CONFLICT, msg.clone()),
            AppError::Db(e) => {
                tracing::error!("Database error: {:?}", e);
                (actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
            AppError::Iam(e) => {
                tracing::error!("IAM error: {:?}", e);
                (actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (actix_web::http::StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
        };
        HttpResponse::build(status).json(serde_json::json!({ "error": message }))
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match e {
            sqlx::Error::RowNotFound => AppError::NotFound("Resource not found".to_string()),
            other => AppError::Db(other),
        }
    }
}

impl From<IamError> for AppError {
    fn from(e: IamError) -> Self {
        match e {
            IamError::InvalidCredentials => AppError::Unauthorized("Invalid credentials".to_string()),
            IamError::TokenExpired | IamError::TokenNotFound | IamError::TokenRevoked => {
                AppError::Unauthorized("Invalid or expired token".to_string())
            }
            IamError::TokenReuseDetected => AppError::Unauthorized("Token has been compromised".to_string()),
            IamError::AccountNotFound => AppError::NotFound("Account not found".to_string()),
            IamError::EmailNotVerified => AppError::Unauthorized("Email not verified".to_string()),
            IamError::EmailAlreadyVerified => AppError::BadRequest("Email already verified".to_string()),
            IamError::InvalidVerificationCode => AppError::BadRequest("Invalid verification code".to_string()),
            IamError::VerificationCodeExpired => AppError::BadRequest("Verification code expired".to_string()),
            IamError::WeakPassword(msg) => AppError::BadRequest(msg),
            IamError::AuthTypeMismatch => AppError::Conflict("This email is already registered with a different authentication method".to_string()),
            IamError::InvalidOAuthToken => AppError::Unauthorized("Invalid OAuth token".to_string()),
            IamError::OAuthEmailNotVerified => AppError::BadRequest("OAuth account email is not verified".to_string()),
            other => AppError::Iam(other),
        }
    }
}
