const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const mysql = require('mysql2/promise');

function stripQuotes(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const host = stripQuotes(process.env.DB_HOST) || 'localhost';
const portRaw = stripQuotes(process.env.DB_PORT);
const port = portRaw ? Number(portRaw) : 3306;
const user = stripQuotes(process.env.DB_USER || process.env.DB_USERNAME) || 'root';
const password = stripQuotes(process.env.DB_PASSWORD) || '';

async function run(label, options) {
  try {
    const conn = await mysql.createConnection(options);
    await conn.query('SELECT 1');
    await conn.end();
    console.log(`${label}: OK`);
  } catch (err) {
    console.log(`${label}: FAIL`);
    console.log(err);
  }
}

(async () => {
  console.log('Host:', host);
  console.log('Port:', Number.isFinite(port) ? port : 3306);
  console.log('User:', user);
  console.log('Password set:', Boolean(password));

  await run('NO_SSL', { host, port, user, password });
  await run('SSL(rejectUnauthorized=false)', { host, port, user, password, ssl: { rejectUnauthorized: false } });
})();
