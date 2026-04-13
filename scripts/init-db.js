const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'db.ygxylipuujhrfmasce.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'WcF2VnBswqNAFlpF',
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
});

async function main() {
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await client.query(sql);
  console.log('Schema initialized successfully.');
  await client.end();
}

main().catch((err) => {
  console.error('Failed to initialize schema:', err);
  process.exit(1);
});
