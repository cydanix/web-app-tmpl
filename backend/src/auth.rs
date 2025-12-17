use actix_web::{dev::ServiceRequest, web, Error, HttpMessage, FromRequest};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use nano_iam::{AuthService, IamError};
use std::sync::Arc;
use std::future::{ready, Ready};

#[derive(Clone)]
pub struct AuthenticatedUser {
    pub account_id: nano_iam::AccountId,
    pub email: String,
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

    req.extensions_mut().insert(AuthenticatedUser {
        account_id: account.id,
        email: account.email,
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

