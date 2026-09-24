/**
 * Migration: Drop legacy `conversations` and `chat_messages` tables and let
 * the application's `ensureDatabaseSchema()` create the new `chats` table.
 *
 * Run once:  npx tsx scripts/migrate-chats.ts
 */
import { getPool } from '../lib/db';

async function migrate() {
  const pool = getPool();
  console.log('⏳  Dropping legacy tables (chat_messages, conversations)...');
  await pool.query(`
    DROP TABLE IF EXISTS chat_messages CASCADE;
    DROP TABLE IF EXISTS conversations CASCADE;
  `);
  console.log('✅  Legacy tables dropped.');

  // Re-create schema with the new `chats` table
  const { ensureDatabaseSchema } = await import('../lib/db');
  await ensureDatabaseSchema();
  console.log('✅  New schema ensured (chats table created).');

  await pool.end();
  console.log('🎉  Migration complete.');
}

migrate().catch((err) => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
