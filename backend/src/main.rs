mod auth;
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

    // Database connection
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/webapp".to_string());
    
    log::info!("Connecting to database...");
    let db_pool = sqlx::PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Set up nano-iam and create its schema FIRST (before our migrations)
    // This is required because our migrations reference the accounts table from nano-iam
    let iam_repo = Repo::new(db_pool.clone());
    
    // Create nano-iam schema if it doesn't exist
    log::info!("Initializing nano-iam schema...");
    if let Err(e) = iam_repo.create_schema().await {
        log::warn!("Failed to create nano-iam schema (may already exist): {:?}", e);
    }

    // Run our migrations AFTER nano-iam schema is created
    // sqlx::migrate! looks for migrations/ relative to Cargo.toml
    log::info!("Running migrations...");
    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await
        .expect("Failed to run migrations");
    
    let email_sender: Arc<dyn EmailSender> = Arc::new(DummyEmailSender);
    let lock = LeaseLock::new(db_pool.clone());

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
            .app_data(web::Data::new(db_pool.clone()))
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
            // Protected routes
            .service(
                web::scope("/api/auth")
                    .wrap(auth)
                    .route("/logout", web::post().to(handlers::logout))
                    .route("/me", web::get().to(handlers::get_me))
                    .route("/change-password", web::post().to(handlers::change_password))
                    .route("/delete-account", web::post().to(handlers::delete_account)),
            )
    })
    .bind(&bind_address)?
    .run()
    .await
}
