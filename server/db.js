const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'taskmanager.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
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
  `);

  // Migration: ensure status column exists in users table if table was previously created
  try {
    const colInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasStatus = colInfo.some(c => c.name === 'status');
    if (!hasStatus) {
      db.prepare("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'").run();
    }
  } catch (err) {
    console.error('Migration error:', err);
  }

  // Seed default Founder account and standard departments if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedInitialData();
  }
}

function seedInitialData() {
  const hashedPassword = bcrypt.hashSync('password123', 10);

  // Create core Teams
  const insertTeam = db.prepare('INSERT INTO teams (name, description) VALUES (?, ?)');
  const engTeam = insertTeam.run('Engineering & Tech', 'Core software development, backend, frontend, QA and DevOps');
  const designTeam = insertTeam.run('Design & Creative', 'UI/UX design, branding, product research');
  const opsTeam = insertTeam.run('Operations & Management', 'Business operations, project delivery, and strategy');

  // Insert initial Founder
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, title, department, team_id, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'Company Founder',
    'founder@company.com',
    hashedPassword,
    'founder',
    'Founder & CEO',
    'Executive Leadership',
    opsTeam.lastInsertRowid,
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'approved'
  );

  console.log('✅ Initial database setup complete: Founder account created (founder@company.com / password123)');
}

initDb();

module.exports = { db };
