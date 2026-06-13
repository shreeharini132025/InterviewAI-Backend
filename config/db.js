const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

require('./env');

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

function parseMySqlUrl(rawValue) {
  if (!rawValue) return null;

  try {
    const url = new URL(stripQuotes(rawValue));
    if (!['mysql:', 'mysql2:'].includes(url.protocol)) return null;

    const databaseName = url.pathname.replace(/^\//, '');

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      database: decodeURIComponent(databaseName || '')
    };
  } catch {
    return null;
  }
}

function resolveDbConfig() {
  const mysqlUrl =
    parseMySqlUrl(process.env.DATABASE_URL) ||
    parseMySqlUrl(process.env.MYSQL_URL);

  if (mysqlUrl) {
    return {
      host: mysqlUrl.host,
      port: Number.isFinite(mysqlUrl.port) ? mysqlUrl.port : 3306,
      user: mysqlUrl.user || 'root',
      password: mysqlUrl.password || '',
      database: mysqlUrl.database || 'sip_db'
    };
  }

  const host = stripQuotes(process.env.DB_HOST);
  const portRaw = stripQuotes(process.env.DB_PORT);
  const user = stripQuotes(process.env.DB_USER || process.env.DB_USERNAME);
  const password = stripQuotes(process.env.DB_PASSWORD);
  const database = stripQuotes(process.env.DB_NAME || process.env.DB_DATABASE);

  if (!host && !portRaw && !user && !password && !database) {
    return null;
  }

  return {
    host: host || 'localhost',
    port: portRaw ? Number(portRaw) : 3306,
    user: user || 'root',
    password: password || '',
    database: database || 'sip_db'
  };
}

const dbConfig = resolveDbConfig();

function parseBoolean(value) {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

const useSsl = parseBoolean(process.env.DB_SSL);
const caPath = path.join(__dirname, '..', 'isrgrootx1.pem');
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

function createUnavailablePool() {
  const error = new Error(
    'Database configuration is missing. Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in Render.'
  );
  error.code = 'DB_CONFIG_MISSING';

  return {
    query: async () => {
      throw error;
    },
    execute: async () => {
      throw error;
    }
  };
}

const pool = dbConfig
  ? mysql.createPool({
      host: dbConfig.host,
      port: Number.isFinite(dbConfig.port) ? dbConfig.port : 3306,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,

      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,

      enableKeepAlive: true,
      keepAliveInitialDelay: 0,

      connectTimeout: 10000
    })
  : createUnavailablePool();

async function initializeDatabase() {
  if (!fs.existsSync(schemaPath)) {
    return;
  }

  if (!dbConfig) {
    return;
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const bootstrapOptions = {
    host: dbConfig.host,
    port: Number.isFinite(dbConfig.port) ? dbConfig.port : 3306,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
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