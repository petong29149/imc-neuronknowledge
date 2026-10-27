import type { ConnectionType } from '@/lib/studio/types';
import { clickhouseDriver } from './clickhouse';
import { mssqlDriver } from './mssql';
import { mysqlDriver } from './mysql';
import { oracleDriver } from './oracle';
import { postgresDriver } from './postgres';
import { redshiftDriver } from './redshift';
import type { DbDriver } from './types';

const drivers: Record<ConnectionType, DbDriver> = {
  postgresql: postgresDriver,
  // CockroachDB speaks the PostgreSQL protocol and supports the catalog queries used there.
  cockroachdb: postgresDriver,
  redshift: redshiftDriver,
  mysql: mysqlDriver,
  // MariaDB speaks the MySQL protocol and exposes the same information_schema privilege tables.
  mariadb: mysqlDriver,
  mssql: mssqlDriver,
  oracle: oracleDriver,
  clickhouse: clickhouseDriver,
};

export function getDriver(type: ConnectionType): DbDriver | null {
  return drivers[type] ?? null;
}

export * from './types';
