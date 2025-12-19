mod auth;
mod dba;
mod handlers;
mod models;

use actix_cors::Cors;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use actix_web_httpauth::middleware::HttpAuthentication;
use chrono::{Local, Duration};
use nano_iam::{
    AuthConfig, AuthService, EmailVerificationConfig, PasswordPolicy, Repo, TokenConfig,
};
use nano_iam::{LeaseLock, IamError};
use nano_iam::email::EmailSender;
use serde::Serialize;
use std::env;
use std::sync::Arc;

#[derive(Serialize)]
struct StatusResponse {
    status: String,
    server_time: String,
    timestamp: i64,
}

#[get("/api/status")]
async fn get_status() -> impl Responder {
    let now = Local::now();
    let response = StatusResponse {
        status: "ok".to_string(),
        server_time: now.to_rfc3339(),
        timestamp: now.timestamp(),
    };
    HttpResponse::Ok().json(response)
}

#[get("/api/health")]
async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy"
    }))
}

// Dummy email sender for development
struct DummyEmailSender;

#[async_trait::async_trait]
impl EmailSender for DummyEmailSender {
    async fn send_verification_email(
        &self,
        to: &str,
        code: &str,
        _service_name: Option<&str>,
    ) -> Result<(), IamError> {
        log::info!("[DEV] Verification email to {}: code = {}", to, code);
        Ok(())
    }

    async fn send_password_reset_email(
        &self,
        to: &str,
        code: &str,
        _service_name: Option<&str>,
    ) -> Result<(), IamError> {
        log::info!("[DEV] Password reset email to {}: code = {}", to, code);
        Ok(())
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    // Initialize database through DBA layer
    let db_context = dba::initialize_database()
        .await
        .expect("Failed to initialize database");
    
    let email_sender: Arc<dyn EmailSender> = Arc::new(DummyEmailSender);
    let lock = LeaseLock::new(db_context.pool().clone());
    
    // Create IAM repository for auth service
    let iam_repo = Repo::new(db_context.pool().clone());

    let auth_config = AuthConfig {
        token: TokenConfig {
            access_ttl: Duration::hours(1),      // 1 hour
            refresh_ttl: Duration::days(30),     // 30 days
        },
        email_verification: EmailVerificationConfig {
            code_ttl: Duration::hours(1), // 1 hour
            code_length: 6,
        },
        password_policy: PasswordPolicy::default(),
        service_name: Some("WebApp".to_string()),
    };

    let auth_service = Arc::new(AuthService::new(
        iam_repo,
        email_sender,
        auth_config,
        lock,
    ));

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_address = format!("{}:{}", host, port);

    log::info!("Starting server at http://{}", bind_address);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        let auth = HttpAuthentication::bearer(auth::validator);

        App::new()
            .app_data(web::Data::new(db_context.clone()))
            .app_data(web::Data::new(auth_service.clone()))
            .wrap(cors)
            .wrap(actix_web::middleware::Logger::default())
            // Public routes
            .service(get_status)
            .service(health_check)
            .route(
                "/api/auth/signup",
                web::post().to(handlers::signup),
            )
            .route(
                "/api/auth/login",
                web::post().to(handlers::login),
            )
            .route(
                "/api/auth/google",
                web::post().to(handlers::google_login),
            )
            .route(
                "/api/auth/verify-email",
                web::post().to(handlers::verify_email),
            )
            .route(
                "/api/auth/resend-verification",
                web::post().to(handlers::resend_verification),
            )
            .route(
                "/api/auth/refresh",
                web::post().to(handlers::refresh_token),
            )
            // Protected routes
            .service(
                web::scope("/api/auth")
                    .wrap(auth.clone())
                    .route("/logout", web::post().to(handlers::logout))
                    .route("/me", web::get().to(handlers::get_me))
                    .route("/change-password", web::post().to(handlers::change_password))
                    .route("/delete-account", web::post().to(handlers::delete_account)),
            )
            // Notification routes (all protected)
            .service(
                web::scope("/api/notifications")
                    .wrap(auth.clone())
                    .route("", web::get().to(handlers::get_notifications))
                    .route("", web::post().to(handlers::create_notification))
                    .route("/unread-count", web::get().to(handlers::get_unread_count))
                    .route(
                        "/{id}",
                        web::put().to(handlers::update_notification),
                    )
                    .route(
                        "/{id}",
                        web::delete().to(handlers::delete_notification),
                    )
                    .route(
                        "/batch",
                        web::put().to(handlers::update_notifications_batch),
                    )
                    .route(
                        "/batch",
                        web::delete().to(handlers::delete_notifications_batch),
                    ),
            )
            // Account settings routes
            .service(
                web::scope("/api/account/settings")
                    .wrap(auth.clone())
                    .route("", web::get().to(handlers::get_account_settings))
                    .route("", web::put().to(handlers::update_account_settings)),
            )
    })
    .bind(&bind_address)?
    .run()
    .await
}
