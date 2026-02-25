#!/bin/bash
set -e

# Create the IAM database if it doesn't exist.
# POSTGRES_DB (app database) is created automatically by the postgres image.
# This script runs once on first container start (docker-entrypoint-initdb.d).
IAM_DB="${POSTGRES_IAM_DB:-webapp_iam}"

if ! psql --username "$POSTGRES_USER" -lqt | cut -d'|' -f1 | grep -qw "$IAM_DB"; then
    psql --username "$POSTGRES_USER" -c "CREATE DATABASE \"$IAM_DB\""
    echo "IAM database '$IAM_DB' created."
else
    echo "IAM database '$IAM_DB' already exists, skipping."
fi
