use sqlx::PgPool;
use std::env;
use nano_iam::Repo;
use chrono::Utc;
use uuid::Uuid;
use crate::models::Account;

/// Database connection configuration
pub struct DbConfig {
    pub url: String,
}

impl DbConfig {
    /// Create database configuration from environment or defaults
    pub fn from_env() -> Self {
        let url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/webapp".to_string());
        Self { url }
    }
}

/// Database context that wraps the connection pool
#[derive(Clone)]
pub struct DbContext {
    pool: PgPool,
}

impl DbContext {
    /// Create a new database context from a pool
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get a reference to the underlying pool (for compatibility with nano-iam)
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

/// Initialize database connection pool
async fn create_pool(config: &DbConfig) -> Result<PgPool, sqlx::Error> {
    log::info!("Connecting to database...");
    sqlx::PgPool::connect(&config.url).await
}

/// Initialize nano-iam schema
async fn init_iam_schema(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let iam_repo = Repo::new(pool.clone());
    log::info!("Initializing nano-iam schema...");
    if let Err(e) = iam_repo.create_schema().await {
        log::warn!("Failed to create nano-iam schema (may already exist): {:?}", e);
    }
    Ok(())
}

/// Run database migrations
async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    log::info!("Running migrations...");
    // sqlx::migrate! looks for migrations/ relative to Cargo.toml
    sqlx::migrate!("./migrations").run(pool).await
}

/// Initialize database: connect, create schema, and run migrations
pub async fn initialize_database() -> Result<DbContext, Box<dyn std::error::Error>> {
    let config = DbConfig::from_env();
    let pool = create_pool(&config)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    // Set up nano-iam and create its schema FIRST (before our migrations)
    // This is required because our migrations reference the accounts table from nano-iam
    init_iam_schema(&pool).await?;

    // Run our migrations AFTER nano-iam schema is created
    run_migrations(&pool)
        .await
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    Ok(DbContext::new(pool))
}

impl DbContext {
    /// Create a new account record
    pub async fn create_account(
        &self,
        iam_account_id: Uuid,
        display_name: String,
    ) -> Result<Account, sqlx::Error> {
        sqlx::query_as::<_, Account>(
            r#"
            INSERT INTO app_accounts (id, iam_account_id, display_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $4)
            RETURNING id, iam_account_id, display_name, avatar_url, created_at, updated_at
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(iam_account_id)
        .bind(display_name)
        .bind(Utc::now())
        .fetch_one(&self.pool)
        .await
    }

    /// Get account by IAM account ID
    pub async fn get_account_by_iam_id(
        &self,
        iam_account_id: Uuid,
    ) -> Result<Option<Account>, sqlx::Error> {
        sqlx::query_as::<_, Account>(
            r#"
            SELECT id, iam_account_id, display_name, avatar_url, created_at, updated_at
            FROM app_accounts
            WHERE iam_account_id = $1
            "#,
        )
        .bind(iam_account_id)
        .fetch_optional(&self.pool)
        .await
    }

    /// Get account by IAM account ID, or create it if it doesn't exist
    pub async fn get_or_create_account_by_iam_id(
        &self,
        iam_account_id: Uuid,
        display_name: String,
    ) -> Result<Account, sqlx::Error> {
        // Try to get existing account
        if let Some(account) = self.get_account_by_iam_id(iam_account_id).await? {
            return Ok(account);
        }

        // Account doesn't exist, create it
        self.create_account(iam_account_id, display_name).await
    }

    /// Delete account by IAM account ID
    pub async fn delete_account_by_iam_id(
        &self,
        iam_account_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            DELETE FROM app_accounts
            WHERE iam_account_id = $1
            "#,
        )
        .bind(iam_account_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
