use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use nano_iam::Repo;
use chrono::Utc;
use uuid::Uuid;
use std::time::Duration;
use crate::config::AppConfig;
use crate::models::{UserProfile, Notification, AuditLogEntry, PaginatedResponse};

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

    pub fn iam_pool(&self) -> &PgPool {
        &self.iam_pool
    }

    pub fn app_pool(&self) -> &PgPool {
        &self.app_pool
    }

    pub async fn health_check(&self) -> (bool, bool) {
        let iam_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(&self.iam_pool)
            .await
            .is_ok();
        let app_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
            .fetch_one(&self.app_pool)
            .await
            .is_ok();
        (iam_ok, app_ok)
    }
}

async fn build_pool(url: &str, config: &AppConfig) -> Result<PgPool, Box<dyn std::error::Error>> {
    let pool = PgPoolOptions::new()
        .max_connections(config.db_max_connections)
        .idle_timeout(Duration::from_secs(config.db_idle_timeout_secs))
        .acquire_timeout(Duration::from_secs(5))
        .connect(url)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;
    Ok(pool)
}

async fn init_iam_schema(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let iam_repo = Repo::new(pool.clone());
    tracing::info!("Initializing nano-iam schema...");
    if let Err(e) = iam_repo.migrate().await {
        tracing::warn!("Failed to create nano-iam schema (may already exist): {:?}", e);
    }
    Ok(())
}

async fn run_migrations(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    use sqlx::migrate::Migrator;
    use std::path::Path;

    tracing::info!("Running backend migrations...");

    let migrator = Migrator::new(Path::new("./migrations"))
        .await
        .map_err(|e| format!("Failed to create migrator: {}", e))?;

    migrator.run(pool)
        .await
        .map_err(|e| format!("Failed to run migrations: {}", e))?;

    Ok(())
}

pub async fn initialize_database(config: &AppConfig) -> Result<DbContext, Box<dyn std::error::Error>> {
    tracing::info!("Connecting to IAM database...");
    let iam_pool = build_pool(&config.iam_database_url, config).await?;

    let app_pool = if config.database_url == config.iam_database_url {
        tracing::info!("App database is the same as IAM database");
        iam_pool.clone()
    } else {
        tracing::info!("Connecting to app database...");
        build_pool(&config.database_url, config).await?
    };

    init_iam_schema(&iam_pool).await?;
    run_migrations(&app_pool).await?;

    Ok(DbContext::new(iam_pool, app_pool))
}

// --------------- Profile ---------------

impl DbContext {
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

// --------------- Notifications ---------------

impl DbContext {
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

    pub async fn get_notifications_paginated(
        &self,
        profile_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<PaginatedResponse<Notification>, sqlx::Error> {
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM notifications WHERE profile_id = $1",
        )
        .bind(profile_id)
        .fetch_one(&self.app_pool)
        .await?;

        let items = sqlx::query_as::<_, Notification>(
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
        .await?;

        Ok(PaginatedResponse { items, total, limit, offset })
    }

    pub async fn get_unread_count(
        &self,
        profile_id: Uuid,
    ) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM notifications WHERE profile_id = $1 AND read = false",
        )
        .bind(profile_id)
        .fetch_one(&self.app_pool)
        .await
    }

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

    pub async fn delete_notification(
        &self,
        notification_id: Uuid,
        profile_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "DELETE FROM notifications WHERE id = $1 AND profile_id = $2",
        )
        .bind(notification_id)
        .bind(profile_id)
        .execute(&self.app_pool)
        .await?;
        Ok(())
    }

    pub async fn delete_notifications_batch(
        &self,
        notification_ids: &[Uuid],
        profile_id: Uuid,
    ) -> Result<u64, sqlx::Error> {
        let result = sqlx::query(
            "DELETE FROM notifications WHERE id = ANY($1) AND profile_id = $2",
        )
        .bind(notification_ids)
        .bind(profile_id)
        .execute(&self.app_pool)
        .await?;
        Ok(result.rows_affected())
    }

    pub async fn cleanup_old_notifications(
        &self,
        days_to_keep: i64,
    ) -> Result<u64, sqlx::Error> {
        let cutoff = Utc::now() - chrono::Duration::days(days_to_keep);
        let result = sqlx::query(
            "DELETE FROM notifications WHERE read = true AND created_at < $1",
        )
        .bind(cutoff)
        .execute(&self.app_pool)
        .await?;
        Ok(result.rows_affected())
    }
}

// --------------- Audit Log ---------------

impl DbContext {
    pub async fn write_audit_log(
        &self,
        profile_id: Option<Uuid>,
        action: &str,
        resource: &str,
        detail: Option<&str>,
        ip_address: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO audit_log (id, profile_id, action, resource, detail, ip_address, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(profile_id)
        .bind(action)
        .bind(resource)
        .bind(detail)
        .bind(ip_address)
        .bind(Utc::now())
        .execute(&self.app_pool)
        .await?;
        Ok(())
    }

    pub async fn get_audit_log(
        &self,
        profile_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<PaginatedResponse<AuditLogEntry>, sqlx::Error> {
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM audit_log WHERE profile_id = $1",
        )
        .bind(profile_id)
        .fetch_one(&self.app_pool)
        .await?;

        let items = sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, profile_id, action, resource, detail, ip_address, created_at
            FROM audit_log
            WHERE profile_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(profile_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.app_pool)
        .await?;

        Ok(PaginatedResponse { items, total, limit, offset })
    }

    pub async fn cleanup_old_audit_logs(
        &self,
        days_to_keep: i64,
    ) -> Result<u64, sqlx::Error> {
        let cutoff = Utc::now() - chrono::Duration::days(days_to_keep);
        let result = sqlx::query("DELETE FROM audit_log WHERE created_at < $1")
            .bind(cutoff)
            .execute(&self.app_pool)
            .await?;
        Ok(result.rows_affected())
    }
}
