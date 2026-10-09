import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Load .env via Node's built-in loader or manual fallback
const envPath = path.resolve(process.cwd(), '.env');
if (typeof process.loadEnvFile === 'function' && fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch {}
}

let postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^POSTGRES_URL=(.*)$/);
    if (match) {
      postgresUrl = match[1].trim().replace(/^["']|["']$/g, '');
      break;
    }
  }
}

// Fallback to default local PostgreSQL URL if not set
if (!postgresUrl) {
  postgresUrl = 'postgres://postgres:1234@localhost:5432/imc-neuronknowledge';
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
        'SELECT 1 FROM pg_database WHERE datname = $1',
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

  // Load and apply SQL schema from scripts/schema.sql
  const schemaPath = path.resolve(process.cwd(), 'scripts', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`);
  }

  console.log(`📄 Executing schema file: ${schemaPath}...`);
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await pool.query(schemaSql);
  console.log('✅ All tables, indexes, and initial data from schema.sql applied successfully!');

  // Summary counts
  try {
    const [usersCount, skillsCount, agentsCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM skills'),
      pool.query('SELECT COUNT(*) FROM agents'),
    ]);

    console.log('\n📊 Database Status:');
    console.log(` - Users:  ${usersCount.rows[0].count}`);
    console.log(` - Skills: ${skillsCount.rows[0].count}`);
    console.log(` - Agents: ${agentsCount.rows[0].count}`);
  } catch (statErr) {
    console.warn('Note: Could not retrieve summary counts:', statErr.message);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Database initialization error:', err);
  process.exit(1);
});
