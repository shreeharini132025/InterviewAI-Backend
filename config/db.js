const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

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

const dbHost = stripQuotes(process.env.DB_HOST) || 'localhost';
const dbPortRaw = stripQuotes(process.env.DB_PORT);
const dbPort = dbPortRaw ? Number(dbPortRaw) : 3306;

const dbUser =
  stripQuotes(process.env.DB_USER || process.env.DB_USERNAME) || 'root';

const dbPassword = stripQuotes(process.env.DB_PASSWORD) || '';

const dbName =
  stripQuotes(process.env.DB_NAME || process.env.DB_DATABASE) || 'sip_db';

function parseBoolean(value) {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

const useSsl = parseBoolean(process.env.DB_SSL);
const caPath = path.join(__dirname, '..', 'isrgrootx1.pem');
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

const poolOptions = {
  host: dbHost,
  port: Number.isFinite(dbPort) ? dbPort : 3306,
  user: dbUser,
  password: dbPassword,
  database: dbName,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  connectTimeout: 10000
};

if (useSsl && fs.existsSync(caPath)) {
  poolOptions.ssl = {
    ca: fs.readFileSync(caPath),
    rejectUnauthorized: true
  };
}

const pool = mysql.createPool(poolOptions);

async function initializeDatabase() {
  if (!fs.existsSync(schemaPath)) {
    return;
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const bootstrapOptions = {
    host: dbHost,
    port: Number.isFinite(dbPort) ? dbPort : 3306,
    user: 'root',
    password: 2009,
    database: 'sip_db',
    multipleStatements: true,
    connectTimeout: 10000
  };

  if (useSsl && fs.existsSync(caPath)) {
    bootstrapOptions.ssl = {
      ca: fs.readFileSync(caPath),
      rejectUnauthorized: true
    };
  }

  const connection = await mysql.createConnection(bootstrapOptions);

  try {
    await connection.query(schemaSql);
  } finally {
    await connection.end();
  }
}

module.exports = pool;
module.exports.initializeDatabase = initializeDatabase;