#!/bin/bash
# Runs once, when the data volume is empty: two databases, each owned by its own user.
# Tables are not created here — the app (npm run init-db) and the engine (migrate) do that.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v app_db="$APP_DB" -v app_user="$APP_DB_USER" -v app_pw="$APP_DB_PASSWORD" \
  -v engine_db="$ENGINE_DB" -v engine_user="$ENGINE_DB_USER" -v engine_pw="$ENGINE_DB_PASSWORD" <<'EOSQL'
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_pw';
CREATE ROLE :"engine_user" LOGIN PASSWORD :'engine_pw';

CREATE DATABASE :"app_db" OWNER :"app_user" ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE :"engine_db" OWNER :"engine_user" ENCODING 'UTF8' TEMPLATE template0;

-- Only the owner (and the superuser) may connect: nk_engine cannot read the app's data and vice versa
REVOKE ALL ON DATABASE :"app_db" FROM PUBLIC;
REVOKE ALL ON DATABASE :"engine_db" FROM PUBLIC;
EOSQL

# The app's schema.sql runs CREATE EXTENSION pgcrypto; create it here as superuser so the
# app user never needs extra rights
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DB" \
  -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'

echo "[neuron-devdb] databases ready: $APP_DB (user $APP_DB_USER), $ENGINE_DB (user $ENGINE_DB_USER)"
