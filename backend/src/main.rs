use actix_cors::Cors;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use chrono::Local;
use serde::Serialize;
use std::env;

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

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_address = format!("{}:{}", host, port);

    log::info!("Starting server at http://{}", bind_address);

    HttpServer::new(|| {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(actix_web::middleware::Logger::default())
            .service(get_status)
            .service(health_check)
    })
    .bind(&bind_address)?
    .run()
    .await
}

