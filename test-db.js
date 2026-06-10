/**
 * Run this to test your MySQL/TiDB connection and bootstrap the schema:
 * node test-db.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const mysql = require('mysql2/promise');
const fs = require('fs');

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
const dbUser = stripQuotes(process.env.DB_USER || process.env.DB_USERNAME) || 'root';
const dbPassword = stripQuotes(process.env.DB_PASSWORD) || '';
const dbName = stripQuotes(process.env.DB_NAME || process.env.DB_DATABASE) || 'sip_db';

function assertSafeDbName(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(
      `Unsafe DB_NAME "${name}". Use only letters, numbers, underscore.`
    );
  }
}

async function testConnection() {
  console.log('\n🔍 Testing MySQL/TiDB connection...');
  console.log(`   Host: ${dbHost}`);
  console.log(`   Port: ${Number.isFinite(dbPort) ? dbPort : 3306}`);
  console.log(`   User: ${dbUser}`);
  console.log(`   Pass: ${dbPassword ? '(set)' : '(empty)'}`);
  console.log(`   DB:   ${dbName}\n`);

  try {
    // Connect with multiple statements enabled so we can run schema.sql in one go.
    const conn = await mysql.createConnection({
      host: dbHost,
      port: Number.isFinite(dbPort) ? dbPort : 3306,
      user: dbUser,
      password: dbPassword,
      multipleStatements: true,
    });

    console.log('✅ MySQL connection successful!\n');

    assertSafeDbName(dbName);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);

    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`🧱 Applying schema: ${schemaPath}`);
    await conn.query(schemaSql);

    const [[{ qCount }]] = await conn.query('SELECT COUNT(*) AS qCount FROM questions');
    if (Number(qCount || 0) === 0) {
      console.log('🌱 No questions found; inserting a few starter questions...');
      await conn.query(
        `INSERT INTO questions (category, difficulty, question_text, expected_keywords, ideal_answer, time_limit)
         VALUES
         ('technical','easy','Explain the difference between == and === in JavaScript.','type coercion,strict equality,loose equality','== does type coercion; === compares type and value. Prefer === for predictability.',120),
         ('technical','easy','What is a REST API and what are common HTTP methods used in REST?','resource,stateless,GET,POST,PUT,PATCH,DELETE','REST models resources via URIs and is stateless. Uses GET, POST, PUT/PATCH, DELETE.',150),
         ('technical','medium','Explain what a database index is and when it helps (and hurts) performance.','index,B-tree,lookup,write overhead,selectivity','Indexes speed reads and sorting but add write overhead and storage cost.',180),
         ('hr','easy','Tell me about yourself.','summary,experience,strengths,role','Give a short professional summary: present role, strengths, achievements, and why this role.',120),
         ('behavioral','medium','Describe a time you faced a conflict in a team and how you handled it.','STAR,communication,collaboration,resolution','Use STAR and focus on respectful communication and results.',180)`
      );
    }

    const [tables] = await conn.query('SHOW TABLES');
    console.log(
      `📋 Tables in ${dbName}:`,
      tables.length > 0 ? tables.map((t) => Object.values(t)[0]).join(', ') : 'none'
    );

    await conn.end();
    console.log('\n🚀 All good! You can now start the backend.\n');
  } catch (err) {
    console.error('\n❌ Connection failed:', err.message);
    console.error('\n📝 Fix: Verify DB host/user/password and that your DB user can create databases/tables.\n');
    process.exit(1);
  }
}

testConnection();
