import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Read .env manually if dotenv is not installed
const envPath = path.resolve(process.cwd(), '.env');
let postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^POSTGRES_URL=(.*)$/);
    if (match) {
      postgresUrl = match[1].trim();
      break;
    }
  }
}

console.log('Target POSTGRES_URL:', postgresUrl);

async function main() {
  const { Pool } = pg;
  let pool;
  try {
    pool = new Pool({ connectionString: postgresUrl });
    const res = await pool.query('SELECT current_database(), current_user');
    console.log('✅ Connected successfully to:', res.rows[0]);
  } catch (err) {
    console.warn('⚠️ Could not connect directly to target DB:', err.message);
    const parsed = new URL(postgresUrl);
    const targetDbName = parsed.pathname.replace(/^\//, '');
    parsed.pathname = '/postgres';
    console.log('Connecting to default "postgres" db to check/create database...');
    const defaultPool = new Pool({ connectionString: parsed.toString() });
    try {
      const checkRes = await defaultPool.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [targetDbName]
      );
      if (checkRes.rows.length === 0) {
        console.log(`Database "${targetDbName}" not found. Creating it now...`);
        await defaultPool.query(`CREATE DATABASE "${targetDbName}"`);
        console.log(`✅ Database "${targetDbName}" created successfully!`);
      } else {
        console.log(`Database "${targetDbName}" already exists.`);
      }
    } catch (createErr) {
      console.error('Failed to create target DB:', createErr);
    } finally {
      await defaultPool.end();
    }
    pool = new Pool({ connectionString: postgresUrl });
  }

  // Create users table
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  await pool.query(createTableQuery);
  console.log('✅ "users" table ensured in database.');

  const countRes = await pool.query('SELECT COUNT(*) FROM users');
  console.log(`Current user count: ${countRes.rows[0].count}`);

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Database initialization error:', err);
  process.exit(1);
});
