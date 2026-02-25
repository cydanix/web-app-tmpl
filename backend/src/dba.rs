use sqlx::PgPool;
use std::env;
use nano_iam::Repo;
use chrono::Utc;
use uuid::Uuid;
use crate::models::{UserProfile, Notification};

/// Database connection configuration
pub struct DbConfig {
    pub iam_url: String,
    pub app_url: String,
}

impl DbConfig {
    /// Create database configuration from environment or defaults
    pub fn from_env() -> Self {
        let default_url = "postgresql://postgres:postgres@localhost:5432/webapp".to_string();
        let iam_url = env::var("IAM_DATABASE_URL")
            .unwrap_or_else(|_| env::var("DATABASE_URL").unwrap_or_else(|_| default_url.clone()));
        let app_url = env::var("DATABASE_URL")
            .unwrap_or(default_url);
        Self { iam_url, app_url }
    }
}

/// Database context that wraps both IAM and app connection pools
#[derive(Clone)]
pub struct DbContext {
    iam_pool: PgPool,
    app_pool: PgPool,
}

impl DbContext {
    pub fn new(iam_pool: PgPool, app_pool: PgPool) -> Self {
        Self { iam_pool, app_pool }
    }

    /// Get the IAM pool (for AuthService / LeaseLock)
    pub fn iam_pool(&self) -> &PgPool {
        &self.iam_pool
    }
}

/// Initialize nano-iam schema
async fn init_iam_schema(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let iam_repo = Repo::new(pool.clone());
    log::info!("Initializing nano-iam schema...");
    if let Err(e) = iam_repo.migrate().await {
        log::warn!("Failed to create nano-iam schema (may already exist): {:?}", e);
    }
    Ok(())
}

/// Run app database migrations
async fn run_migrations(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    use sqlx::migrate::Migrator;
    use std::path::Path;

    log::info!("Running backend migrations...");

    let migrator = Migrator::new(Path::new("./migrations"))
        .await
        .map_err(|e| format!("Failed to create migrator: {}", e))?;

    migrator.run(pool)
        .await
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    Ok(())
}

/// Initialize databases: connect to both IAM and app pools, run migrations
pub async fn initialize_database() -> Result<DbContext, Box<dyn std::error::Error>> {
    let config = DbConfig::from_env();

    log::info!("Connecting to IAM database...");
    let iam_pool = sqlx::PgPool::connect(&config.iam_url)
        .await
        .map_err(|e| format!("Failed to connect to IAM database: {}", e))?;

    let app_pool = if config.app_url == config.iam_url {
        log::info!("App database is the same as IAM database");
        iam_pool.clone()
    } else {
        log::info!("Connecting to app database...");
        sqlx::PgPool::connect(&config.app_url)
            .await
            .map_err(|e| format!("Failed to connect to app database: {}", e))?
    };

    // nano-iam migrations run against the IAM pool
    init_iam_schema(&iam_pool).await?;

    // App migrations run against the app pool
    run_migrations(&app_pool).await?;

    Ok(DbContext::new(iam_pool, app_pool))
}

impl DbContext {
    /// Create a new user profile record
    pub async fn create_profile(
        &self,
        iam_account_id: Uuid,
        display_name: String,
    ) -> Result<UserProfile, sqlx::Error> {
        sqlx::query_as::<_, UserProfile>(
            r#"
            INSERT INTO user_profiles (id, iam_account_id, display_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $4)
            RETURNING id, iam_account_id, display_name, avatar_url, username, created_at, updated_at
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(iam_account_id)
        .bind(display_name)
        .bind(Utc::now())
        .fetch_one(&self.app_pool)
        .await
    }

    /// Get user profile by IAM account ID
    pub async fn get_profile_by_iam_id(
        &self,
        iam_account_id: Uuid,
    ) -> Result<Option<UserProfile>, sqlx::Error> {
        sqlx::query_as::<_, UserProfile>(
            r#"
            SELECT id, iam_account_id, display_name, avatar_url, username, created_at, updated_at
            FROM user_profiles
            WHERE iam_account_id = $1
            "#,
        )
        .bind(iam_account_id)
        .fetch_optional(&self.app_pool)
        .await
    }

    /// Get user profile by IAM account ID, or create it if it doesn't exist
    pub async fn get_or_create_profile(
        &self,
        iam_account_id: Uuid,
        display_name: String,
    ) -> Result<UserProfile, sqlx::Error> {
        if let Some(profile) = self.get_profile_by_iam_id(iam_account_id).await? {
            return Ok(profile);
        }
        self.create_profile(iam_account_id, display_name).await
    }

    /// Delete user profile by IAM account ID
    pub async fn delete_profile_by_iam_id(
        &self,
        iam_account_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            DELETE FROM user_profiles
            WHERE iam_account_id = $1
            "#,
        )
        .bind(iam_account_id)
        .execute(&self.app_pool)
        .await?;
        Ok(())
    }

    /// Create a new notification
    pub async fn create_notification(
        &self,
        profile_id: Uuid,
        level: &str,
        message: &str,
    ) -> Result<Notification, sqlx::Error> {
        sqlx::query_as::<_, Notification>(
            r#"
            INSERT INTO notifications (profile_id, level, message, read, created_at, updated_at)
            VALUES ($1, $2, $3, false, $4, $4)
            RETURNING id, profile_id, level, message, read, created_at, updated_at
            "#,
        )
        .bind(profile_id)
        .bind(level)
        .bind(message)
        .bind(Utc::now())
        .fetch_one(&self.app_pool)
        .await
    }

    /// Get notifications for a profile with pagination
    pub async fn get_notifications(
        &self,
        profile_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Notification>, sqlx::Error> {
        sqlx::query_as::<_, Notification>(
            r#"
            SELECT id, profile_id, level, message, read, created_at, updated_at
            FROM notifications
            WHERE profile_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(profile_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.app_pool)
        .await
    }

    /// Get unread notifications count for a profile
    pub async fn get_unread_count(
        &self,
        profile_id: Uuid,
    ) -> Result<i64, sqlx::Error> {
        let result = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*) FROM notifications
            WHERE profile_id = $1 AND read = false
            "#,
        )
        .bind(profile_id)
        .fetch_one(&self.app_pool)
        .await?;
        Ok(result)
    }

    /// Update notification read status
    pub async fn update_notification_read(
        &self,
        notification_id: Uuid,
        profile_id: Uuid,
        read: bool,
    ) -> Result<Notification, sqlx::Error> {
        sqlx::query_as::<_, Notification>(
            r#"
            UPDATE notifications
            SET read = $1, updated_at = $2
            WHERE id = $3 AND profile_id = $4
            RETURNING id, profile_id, level, message, read, created_at, updated_at
            "#,
        )
        .bind(read)
        .bind(Utc::now())
        .bind(notification_id)
        .bind(profile_id)
        .fetch_one(&self.app_pool)
        .await
    }

    /// Mark multiple notifications as read/unread
    pub async fn update_notifications_read_batch(
        &self,
        notification_ids: &[Uuid],
        profile_id: Uuid,
        read: bool,
    ) -> Result<Vec<Notification>, sqlx::Error> {
        sqlx::query_as::<_, Notification>(
            r#"
            UPDATE notifications
            SET read = $1, updated_at = $2
            WHERE id = ANY($3) AND profile_id = $4
            RETURNING id, profile_id, level, message, read, created_at, updated_at
            "#,
        )
        .bind(read)
        .bind(Utc::now())
        .bind(notification_ids)
        .bind(profile_id)
        .fetch_all(&self.app_pool)
        .await
    }

    /// Delete a single notification
    pub async fn delete_notification(
        &self,
        notification_id: Uuid,
        profile_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            DELETE FROM notifications
            WHERE id = $1 AND profile_id = $2
            "#,
        )
        .bind(notification_id)
        .bind(profile_id)
        .execute(&self.app_pool)
        .await?;
        Ok(())
    }

    /// Delete multiple notifications
    pub async fn delete_notifications_batch(
        &self,
        notification_ids: &[Uuid],
        profile_id: Uuid,
    ) -> Result<u64, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM notifications
            WHERE id = ANY($1) AND profile_id = $2
            "#,
        )
        .bind(notification_ids)
        .bind(profile_id)
        .execute(&self.app_pool)
        .await?;
        Ok(result.rows_affected())
    }

    /// Update user profile settings
    pub async fn update_profile_settings(
        &self,
        profile_id: Uuid,
        username: Option<String>,
    ) -> Result<UserProfile, sqlx::Error> {
        sqlx::query_as::<_, UserProfile>(
            r#"
            UPDATE user_profiles
            SET username = $1, updated_at = $2
            WHERE id = $3
            RETURNING id, iam_account_id, display_name, avatar_url, username, created_at, updated_at
            "#,
        )
        .bind(username)
        .bind(Utc::now())
        .bind(profile_id)
        .fetch_one(&self.app_pool)
        .await
    }
}
