mod auth;
mod config;
mod dba;
mod errors;
mod handlers;
mod models;

use actix_cors::Cors;
use actix_governor::{Governor, GovernorConfigBuilder};
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use actix_web_httpauth::middleware::HttpAuthentication;
use chrono::{Duration, Local};
use nano_iam::{AuthConfig, AuthService, EmailVerificationConfig, IamError, PasswordPolicy, Repo, TokenConfig};
use nano_iam::{LeaseLock, email::EmailSender};
use serde::Serialize;
use std::sync::Arc;
use tracing_actix_web::TracingLogger;

#[derive(Serialize)]
struct StatusResponse {
    status: String,
    server_time: String,
    timestamp: i64,
}

#[get("/api/status")]
async fn get_status() -> impl Responder {
    let now = Local::now();
    HttpResponse::Ok().json(StatusResponse {
        status: "ok".to_string(),
        server_time: now.to_rfc3339(),
        timestamp: now.timestamp(),
    })
}

struct DummyEmailSender;

#[async_trait::async_trait]
impl EmailSender for DummyEmailSender {
    async fn send_verification_email(
        &self,
        to: &str,
        code: &str,
        _service_name: Option<&str>,
    ) -> Result<(), IamError> {
        tracing::info!(to = to, "[DEV] Verification email: code = {}", code);
        Ok(())
    }

    async fn send_password_reset_email(
        &self,
        to: &str,
        code: &str,
        _service_name: Option<&str>,
    ) -> Result<(), IamError> {
        tracing::info!(to = to, "[DEV] Password reset email: code = {}", code);
        Ok(())
    }
}

fn spawn_background_cleanup(db_context: dba::DbContext) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
        loop {
            interval.tick().await;
            match db_context.cleanup_old_notifications(90).await {
                Ok(n) if n > 0 => tracing::info!(deleted = n, "Cleaned up old notifications"),
                Err(e) => tracing::warn!("Notification cleanup failed: {:?}", e),
                _ => {}
            }
            match db_context.cleanup_old_audit_logs(365).await {
                Ok(n) if n > 0 => tracing::info!(deleted = n, "Cleaned up old audit logs"),
                Err(e) => tracing::warn!("Audit log cleanup failed: {:?}", e),
                _ => {}
            }
        }
    });
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let app_config = config::AppConfig::from_env();

    if app_config.google_oauth_client_id.is_some() {
        tracing::info!("Google OAuth enabled");
    }

    let db_context = dba::initialize_database(&app_config)
        .await
        .expect("Failed to initialize database");

    let email_sender: Arc<dyn EmailSender> = Arc::new(DummyEmailSender);
    let lock = LeaseLock::new(db_context.iam_pool().clone());
    let iam_repo = Repo::new(db_context.iam_pool().clone());

    let auth_config = AuthConfig {
        token: TokenConfig {
            access_ttl: Duration::hours(app_config.access_token_ttl_hours),
            refresh_ttl: Duration::days(app_config.refresh_token_ttl_days),
        },
        email_verification: EmailVerificationConfig {
            code_ttl: Duration::hours(1),
            code_length: 6,
        },
        password_policy: PasswordPolicy::default(),
        service_name: Some(app_config.service_name.clone()),
    };

    let auth_service = Arc::new(AuthService::new(
        iam_repo,
        email_sender,
        auth_config,
        lock,
    ));

    let iam_repo_data = Repo::new(db_context.iam_pool().clone());

    let bind_address = app_config.bind_address();
    tracing::info!("Starting server at http://{}", bind_address);

    spawn_background_cleanup(db_context.clone());

    let cors_origin = app_config.cors_origin.clone();

    let auth_rate_limit = GovernorConfigBuilder::default()
        .seconds_per_request(2)
        .burst_size(10)
        .finish()
        .expect("Failed to create rate limiter");

    let shared_config = web::Data::new(app_config);

    HttpServer::new(move || {
        let cors = if cors_origin.is_empty() {
            Cors::default()
                .allow_any_origin()
                .allow_any_method()
                .allow_any_header()
                .max_age(3600)
        } else {
            let mut cors_builder = Cors::default();
            for origin in cors_origin.split(',') {
                cors_builder = cors_builder.allowed_origin(origin.trim());
            }
            cors_builder
                .allow_any_method()
                .allow_any_header()
                .max_age(3600)
        };

        let auth = HttpAuthentication::bearer(auth::validator);

        App::new()
            .app_data(web::Data::new(db_context.clone()))
            .app_data(web::Data::new(auth_service.clone()))
            .app_data(web::Data::new(iam_repo_data.clone()))
            .app_data(shared_config.clone())
            .wrap(cors)
            .wrap(TracingLogger::default())
            // Public routes
            .service(get_status)
            .route("/api/health", web::get().to(handlers::health_check))
            // Public auth routes — rate-limited individually
            .service(
                web::resource("/api/auth/signup")
                    .wrap(Governor::new(&auth_rate_limit))
                    .route(web::post().to(handlers::signup)),
            )
            .service(
                web::resource("/api/auth/login")
                    .wrap(Governor::new(&auth_rate_limit))
                    .route(web::post().to(handlers::login)),
            )
            .service(
                web::resource("/api/auth/google")
                    .wrap(Governor::new(&auth_rate_limit))
                    .route(web::post().to(handlers::google_login)),
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
            .route(
                "/api/auth/google-oauth-config",
                web::get().to(handlers::get_google_oauth_config),
            )
            // Protected auth routes
            .service(
                web::scope("/api/auth")
                    .wrap(auth.clone())
                    .route("/logout", web::post().to(handlers::logout))
                    .route("/me", web::get().to(handlers::get_me))
                    .route("/change-password", web::post().to(handlers::change_password))
                    .route("/delete-account", web::post().to(handlers::delete_account)),
            )
            // Notification routes (protected)
            .service(
                web::scope("/api/notifications")
                    .wrap(auth.clone())
                    .route("", web::get().to(handlers::get_notifications))
                    .route("", web::post().to(handlers::create_notification))
                    .route("/unread-count", web::get().to(handlers::get_unread_count))
                    .route("/batch", web::put().to(handlers::update_notifications_batch))
                    .route("/batch", web::delete().to(handlers::delete_notifications_batch))
                    .route("/{id}", web::put().to(handlers::update_notification))
                    .route("/{id}", web::delete().to(handlers::delete_notification)),
            )
            // Profile settings (protected)
            .service(
                web::scope("/api/account/settings")
                    .wrap(auth.clone())
                    .route("", web::get().to(handlers::get_profile_settings))
                    .route("", web::put().to(handlers::update_profile_settings)),
            )
            // Audit log (protected)
            .service(
                web::scope("/api/audit-log")
                    .wrap(auth.clone())
                    .route("", web::get().to(handlers::get_audit_log)),
            )
            // Organization management (protected)
            .service(
                web::scope("/api/org")
                    .wrap(auth.clone())
                    .route("", web::get().to(handlers::get_org))
                    .route("/invite", web::post().to(handlers::invite_member))
                    .route("/members/{profile_id}", web::delete().to(handlers::remove_member))
                    .route("/members/{profile_id}/role", web::put().to(handlers::update_member_role)),
            )
    })
    .bind(&bind_address)?
    .run()
    .await
}
