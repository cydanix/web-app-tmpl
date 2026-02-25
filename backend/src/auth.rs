use actix_web::{dev::ServiceRequest, web, Error, HttpMessage, FromRequest};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use nano_iam::{AuthService, IamError, Repo};
use std::sync::Arc;
use std::future::{ready, Ready};

use crate::dba::DbContext;
use crate::errors::AppError;
use crate::models::{Organization, UserProfile};

#[derive(Clone)]
pub struct AuthenticatedUser {
    pub account_id: nano_iam::AccountId,
    pub email: String,
    pub profile: UserProfile,
    pub org: Organization,
    pub role_id: uuid::Uuid,
    pub role_name: String,
    pub permissions: Vec<String>,
}

pub fn require_permission(user: &AuthenticatedUser, perm: &str) -> Result<(), AppError> {
    if user.permissions.contains(&perm.to_string()) {
        Ok(())
    } else {
        Err(AppError::Forbidden("Insufficient permissions".into()))
    }
}

pub async fn validator(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    let auth_service = match req.app_data::<web::Data<Arc<AuthService>>>() {
        Some(service) => service,
        None => {
            return Err((
                actix_web::error::ErrorInternalServerError("Auth service not configured"),
                req,
            ));
        }
    };

    let db = match req.app_data::<web::Data<DbContext>>() {
        Some(db) => db,
        None => {
            return Err((
                actix_web::error::ErrorInternalServerError("Database not configured"),
                req,
            ));
        }
    };

    let iam_repo = match req.app_data::<web::Data<Repo>>() {
        Some(repo) => repo,
        None => {
            return Err((
                actix_web::error::ErrorInternalServerError("IAM repo not configured"),
                req,
            ));
        }
    };

    let account = match auth_service
        .authenticate_access_token(credentials.token())
        .await
    {
        Ok(acc) => acc,
        Err(e) => {
            let error = match e {
                IamError::TokenExpired | IamError::TokenNotFound | IamError::TokenRevoked => {
                    actix_web::error::ErrorUnauthorized("Invalid or expired token")
                }
                _ => actix_web::error::ErrorInternalServerError("Authentication failed"),
            };
            return Err((error, req));
        }
    };

    let profile = match db.get_profile_by_iam_id(account.id).await {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Err((
                actix_web::error::ErrorUnauthorized("User profile not found"),
                req,
            ));
        }
        Err(_) => {
            return Err((
                actix_web::error::ErrorInternalServerError("Database error"),
                req,
            ));
        }
    };

    let (org, member) = match db.get_org_for_profile(profile.id).await {
        Ok(Some(om)) => om,
        Ok(None) => {
            return Err((
                actix_web::error::ErrorUnauthorized("User has no organization"),
                req,
            ));
        }
        Err(_) => {
            return Err((
                actix_web::error::ErrorInternalServerError("Database error"),
                req,
            ));
        }
    };

    let role_name = match iam_repo.get_role_by_id(member.role_id).await {
        Ok(Some(role)) => role.name,
        Ok(None) => "member".to_string(),
        Err(_) => "member".to_string(),
    };

    let permissions = match iam_repo.get_permissions_for_role(member.role_id).await {
        Ok(perms) => perms,
        Err(_) => vec![],
    };

    req.extensions_mut().insert(AuthenticatedUser {
        account_id: account.id,
        email: account.email,
        profile,
        org,
        role_id: member.role_id,
        role_name,
        permissions,
    });

    Ok(req)
}

impl FromRequest for AuthenticatedUser {
    type Error = Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(
        req: &actix_web::HttpRequest,
        _payload: &mut actix_web::dev::Payload,
    ) -> Self::Future {
        let user = req.extensions().get::<AuthenticatedUser>().cloned();
        ready(
            user.ok_or_else(|| {
                actix_web::error::ErrorUnauthorized("User not authenticated")
            })
        )
    }
}
