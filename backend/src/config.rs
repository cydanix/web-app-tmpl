use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub cors_origin: String,
    pub database_url: String,
    pub iam_database_url: String,
    pub google_oauth_client_id: Option<String>,
    pub service_name: String,
    pub db_max_connections: u32,
    pub db_idle_timeout_secs: u64,
    pub access_token_ttl_hours: i64,
    pub refresh_token_ttl_days: i64,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let default_db = "postgresql://postgres:postgres@localhost:5432/webapp".to_string();
        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| default_db.clone());
        let iam_database_url = env::var("IAM_DATABASE_URL").unwrap_or_else(|_| database_url.clone());

        let google_client_id = env::var("GOOGLE_OAUTH_CLIENT_ID").ok().filter(|s| !s.is_empty());

        Self {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8080),
            cors_origin: env::var("CORS_ORIGIN").unwrap_or_default(),
            database_url,
            iam_database_url,
            google_oauth_client_id: google_client_id,
            service_name: env::var("SERVICE_NAME").unwrap_or_else(|_| "WebApp".to_string()),
            db_max_connections: env::var("DB_MAX_CONNECTIONS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
            db_idle_timeout_secs: env::var("DB_IDLE_TIMEOUT_SECS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(300),
            access_token_ttl_hours: env::var("ACCESS_TOKEN_TTL_HOURS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1),
            refresh_token_ttl_days: env::var("REFRESH_TOKEN_TTL_DAYS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(30),
        }
    }

    pub fn bind_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
