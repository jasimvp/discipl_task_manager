const path = require('path');
const fs = require('fs');
const dns = require('dns');
const dotenv = require('dotenv');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

const isPostgres = !!process.env.DATABASE_URL;

let pool = null;
let sqliteDb = null;
let initDbPromise = null;

// Automatically handles special characters in password in postgres URI
function sanitizeDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const match = url.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^@]+)$/);
  if (!match) return url;
  const proto = match[1];
  const user = match[2];
  const rawPassword = match[3];
  const hostAndDb = match[4];
  let cleanPass;
  try {
    cleanPass = encodeURIComponent(decodeURIComponent(rawPassword));
  } catch (e) {
    cleanPass = encodeURIComponent(rawPassword);
  }
  return proto + user + ':' + cleanPass + '@' + hostAndDb;
}

if (isPostgres) {
  const { Pool, types } = require('pg');
  // Parse BIGINT (e.g. COUNT(*)) as standard JS numbers instead of strings
  types.setTypeParser(20, (val) => parseInt(val, 10));

  const rawConnectionString = process.env.DATABASE_URL;
  const connectionString = sanitizeDatabaseUrl(rawConnectionString);
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  console.log('📡 Connected to Supabase PostgreSQL cloud database.');
} else {
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'taskmanager.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
  sqliteDb.pragma('journal_mode = WAL');
  console.log(`📁 Connected to local SQLite database at ${dbPath}`);
}

function convertSqlToPostgres(sql) {
  let paramIndex = 1;
  let converted = sql;

  // Convert SQLite INSERT OR IGNORE INTO to standard PostgreSQL
  const isInsertOrIgnore = /INSERT\s+OR\s+IGNORE\s+INTO/i.test(converted);
  if (isInsertOrIgnore) {
    converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  }

  // Replace ? placeholders with $1, $2, $3...
  converted = converted.replace(/\?/g, () => `$${paramIndex++}`);

  if (isInsertOrIgnore && !/ON\s+CONFLICT/i.test(converted)) {
    converted += ' ON CONFLICT DO NOTHING';
  }

  return converted;
}

function normalizeArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

const db = {
  isPostgres,
  prepare(sql) {
    if (isPostgres) {
      const pgSql = convertSqlToPostgres(sql);
      const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
      const hasReturning = /RETURNING/i.test(pgSql);

      return {
        async get(...args) {
          if (initDbPromise) await initDbPromise;
          const params = normalizeArgs(args);
          const res = await pool.query(pgSql, params);
          return res.rows[0] !== undefined ? res.rows[0] : undefined;
        },
        async all(...args) {
          if (initDbPromise) await initDbPromise;
          const params = normalizeArgs(args);
          const res = await pool.query(pgSql, params);
          return res.rows;
        },
        async run(...args) {
          if (initDbPromise) await initDbPromise;
          const params = normalizeArgs(args);
          let execSql = pgSql.trim().replace(/;$/, '');
          if (isInsert && !hasReturning) {
            execSql += ' RETURNING id';
          }
          const res = await pool.query(execSql, params);
          return {
            lastInsertRowid: res.rows[0]?.id || res.rows[0]?.ID || null,
            changes: res.rowCount || 0,
          };
        },
      };
    } else {
      const stmt = sqliteDb.prepare(sql);
      return {
        async get(...args) {
          if (initDbPromise) await initDbPromise;
          const params = normalizeArgs(args);
          return stmt.get(...params);
        },
        async all(...args) {
          if (initDbPromise) await initDbPromise;
          const params = normalizeArgs(args);
          return stmt.all(...params);
        },
        async run(...args) {
          if (initDbPromise) await initDbPromise;
          const params = normalizeArgs(args);
          return stmt.run(...params);
        },
      };
    }
  },

  async exec(sql) {
    if (initDbPromise) await initDbPromise;
    if (isPostgres) {
      await pool.query(sql);
    } else {
      sqliteDb.exec(sql);
    }
  },
};

// Database Schema Initialization
async function initDb() {
  if (isPostgres) {
    try {
      const tables = [
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('founder', 'team_lead', 'employee')),
          title TEXT,
          department TEXT,
          team_id INTEGER,
          avatar TEXT,
          status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('approved', 'pending', 'rejected')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS teams (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          lead_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'completed')),
          priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
          assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
          assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
          due_date TEXT,
          progress_pct INTEGER DEFAULT 0,
          rejection_status TEXT DEFAULT 'none' CHECK(rejection_status IN ('none', 'requested', 'rejected', 'reassigned')),
          rejection_reason TEXT,
          rejected_at TIMESTAMP,
          deliverable_url TEXT,
          deliverable_notes TEXT,
          claimed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          claimed_at TIMESTAMP,
          is_chain INTEGER DEFAULT 0,
          active_stage_index INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS task_activities (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          activity_type TEXT NOT NULL,
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
          is_read INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS task_comments (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          deliverable_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS task_assignees (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_tag TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(task_id, user_id)
        )`,
        `CREATE TABLE IF NOT EXISTS company_invites (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL DEFAULT 'employee',
          department TEXT,
          title TEXT,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS task_chain_stages (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          stage_order INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          assigned_to INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed')),
          deliverable_url TEXT,
          deliverable_notes TEXT,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      for (const tableSql of tables) {
        await pool.query(tableSql);
      }

      // Seed default teams if empty in Postgres
      const teamCountRes = await pool.query('SELECT COUNT(*) as count FROM teams');
      if (Number(teamCountRes.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO teams (name, description) VALUES
          ('Engineering & Tech', 'Core software development, backend, frontend, QA and infrastructure'),
          ('Product & Design', 'UI/UX design, product strategy, user experience and wireframing'),
          ('Marketing & Growth', 'Brand marketing, outreach, growth and content strategy'),
          ('Operations & Management', 'Business operations, project delivery, and administration')
        `);
        console.log('✅ Supabase PostgreSQL: Discipl core departments initialized.');
      }

      // Repair any users with missing or zero team_id
      try {
        await pool.query(`
          UPDATE users SET team_id = 1 WHERE (team_id IS NULL OR team_id = 0) AND (department LIKE '%Eng%' OR department IS NULL);
          UPDATE users SET team_id = 2 WHERE (team_id IS NULL OR team_id = 0) AND department LIKE '%Product%';
          UPDATE users SET team_id = 3 WHERE (team_id IS NULL OR team_id = 0) AND department LIKE '%Market%';
          UPDATE users SET team_id = 4 WHERE (team_id IS NULL OR team_id = 0) AND department LIKE '%Operat%';
          UPDATE users SET team_id = 1 WHERE team_id IS NULL OR team_id = 0;
        `);
      } catch (e) {}
    } catch (err) {
      console.error('❌ Failed to initialize Supabase PostgreSQL database schema:', err);
    }
  } else {
    // SQLite schema
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('founder', 'team_lead', 'employee')),
        title TEXT,
        department TEXT,
        team_id INTEGER,
        avatar TEXT,
        status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('approved', 'pending', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        lead_id INTEGER,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'completed')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        assigned_to INTEGER,
        assigned_by INTEGER NOT NULL,
        team_id INTEGER,
        due_date TEXT,
        progress_pct INTEGER DEFAULT 0,
        rejection_status TEXT DEFAULT 'none' CHECK(rejection_status IN ('none', 'requested', 'rejected', 'reassigned')),
        rejection_reason TEXT,
        rejected_at DATETIME,
        deliverable_url TEXT,
        deliverable_notes TEXT,
        claimed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        claimed_at DATETIME,
        is_chain INTEGER DEFAULT 0,
        active_stage_index INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS task_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER,
        team_id INTEGER,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        task_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS task_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        deliverable_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS task_assignees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role_tag TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, user_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS company_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        department TEXT,
        title TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS task_chain_stages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        stage_order INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        assigned_to INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'completed')),
        deliverable_url TEXT,
        deliverable_notes TEXT,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Migrations for existing SQLite database
    try { sqliteDb.exec('ALTER TABLE tasks ADD COLUMN deliverable_url TEXT'); } catch (e) {}
    try { sqliteDb.exec('ALTER TABLE tasks ADD COLUMN deliverable_notes TEXT'); } catch (e) {}
    try { sqliteDb.exec('ALTER TABLE tasks ADD COLUMN claimed_by INTEGER REFERENCES users(id) ON DELETE SET NULL'); } catch (e) {}
    try { sqliteDb.exec('ALTER TABLE tasks ADD COLUMN claimed_at DATETIME'); } catch (e) {}
    try { sqliteDb.exec('ALTER TABLE tasks ADD COLUMN is_chain INTEGER DEFAULT 0'); } catch (e) {}
    try { sqliteDb.exec('ALTER TABLE tasks ADD COLUMN active_stage_index INTEGER DEFAULT 0'); } catch (e) {}
    try {
      sqliteDb.exec(`
        INSERT OR IGNORE INTO task_assignees (task_id, user_id)
        SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL
      `);
    } catch (e) {}

    // Seed default teams if empty in SQLite
    const teamCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM teams').get().count;
    if (teamCount === 0) {
      const insertTeam = sqliteDb.prepare('INSERT INTO teams (name, description) VALUES (?, ?)');
      insertTeam.run('Engineering & Tech', 'Core software development, backend, frontend, QA and infrastructure');
      insertTeam.run('Product & Design', 'UI/UX design, product strategy, user experience and wireframing');
      insertTeam.run('Marketing & Growth', 'Brand marketing, outreach, growth and content strategy');
      insertTeam.run('Operations & Management', 'Business operations, project delivery, and administration');
      console.log('✅ SQLite: Discipl core departments initialized.');
    }

    // Repair any users with missing or zero team_id
    try {
      sqliteDb.exec(`
        UPDATE users SET team_id = 1 WHERE (team_id IS NULL OR team_id = 0) AND (department LIKE '%Eng%' OR department IS NULL);
        UPDATE users SET team_id = 2 WHERE (team_id IS NULL OR team_id = 0) AND department LIKE '%Product%';
        UPDATE users SET team_id = 3 WHERE (team_id IS NULL OR team_id = 0) AND department LIKE '%Market%';
        UPDATE users SET team_id = 4 WHERE (team_id IS NULL OR team_id = 0) AND department LIKE '%Operat%';
        UPDATE users SET team_id = 1 WHERE team_id IS NULL OR team_id = 0;
      `);
    } catch (e) {}
  }
}

// Start database initialization
initDbPromise = initDb();

module.exports = { db, initDb };
