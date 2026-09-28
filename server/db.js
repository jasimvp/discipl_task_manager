const Database = require('better-sqlite3');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'taskmanager.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency in production
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

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
  `);

  // Safe migrations for existing database
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN deliverable_url TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN deliverable_notes TEXT');
  } catch (e) {}
  try {
    db.exec("UPDATE users SET status = 'approved' WHERE status = 'pending'");
  } catch (e) {}

  // Seed default Discipl company teams if empty (no users seeded - fully dynamic!)
  const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
  if (teamCount === 0) {
    const insertTeam = db.prepare('INSERT INTO teams (name, description) VALUES (?, ?)');
    insertTeam.run('Engineering & Tech', 'Core software development, backend, frontend, QA and infrastructure');
    insertTeam.run('Product & Design', 'UI/UX design, product strategy, user experience and wireframing');
    insertTeam.run('Marketing & Growth', 'Brand marketing, outreach, growth and content strategy');
    insertTeam.run('Operations & Management', 'Business operations, project delivery, and administration');
    console.log('✅ Discipl core departments initialized.');
  }
}

initDb();

module.exports = { db };
