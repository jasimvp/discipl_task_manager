const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { generateToken, authMiddleware, requireRoles } = require('../auth');

// Check setup status (detects if company needs initial Founder registration)
router.get('/setup-status', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const founderCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'founder'").get().count;
  res.json({
    needsFounderSetup: founderCount === 0,
    totalUsers: userCount,
  });
});

// Register - Creates account and logs in immediately
router.post('/register', (req, res) => {
  const { name, email, password, role, title, department, team_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
// Generate static corporate SVG avatar based on name and role
function generateStaticAvatar(name, role) {
  const initials = (name || 'User')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  let bg1 = '#4f46e5';
  let bg2 = '#7c3aed';
  if (role === 'founder') {
    bg1 = '#7e22ce';
    bg2 = '#9333ea';
  } else if (role === 'team_lead') {
    bg1 = '#2563eb';
    bg2 = '#0284c7';
  } else {
    bg1 = '#059669';
    bg2 = '#0d9488';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="100" height="100" rx="30" fill="url(#g)"/><text x="50" y="58" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="38" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

  const targetRole = role || 'employee';
  const avatar = generateStaticAvatar(name, targetRole);
  const initialStatus = targetRole === 'founder' ? 'approved' : 'pending';

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password, role, title, department, team_id, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name.trim(),
    cleanEmail,
    hashedPassword,
    targetRole,
    title ? title.trim() : (targetRole === 'founder' ? 'Founder & CEO' : targetRole === 'team_lead' ? 'Team Lead' : 'Employee'),
    department ? department.trim() : 'General',
    team_id ? Number(team_id) : null,
    avatar,
    initialStatus
  );

  const newUserId = result.lastInsertRowid;

  // If employee or lead, notify founders so they can approve/assign department
  if (initialStatus === 'pending') {
    const founders = db.prepare("SELECT id FROM users WHERE role = 'founder' AND status = 'approved'").all();
    for (const f of founders) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'access_request')
        `).run(
          f.id,
          'New Employee Registration',
          `${name.trim()} registered as ${targetRole === 'team_lead' ? 'Team Lead' : 'Employee'} (${department || 'General'}).`
        );
      } catch (err) {
        console.error(err);
      }
    }

    if (req.io) {
      req.io.emit('new_access_request', {
        id: newUserId,
        name: name.trim(),
        email: cleanEmail,
        role: targetRole,
        department,
      });
    }
  }

  // Generate token and log in immediately
  const newUser = db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(newUserId);
  const token = generateToken(newUser);

  res.status(201).json({
    token,
    user: newUser,
    message: initialStatus === 'pending'
      ? 'Welcome to Discipl! You are logged in. Your company verification request has been sent to the Founder.'
      : 'Welcome to Discipl! Founder account created successfully.',
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    token,
    user: userWithoutPassword,
  });
});

// Current user profile
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.team_id, u.avatar, u.status,
           t.name as team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// List all active users
router.get('/users', authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.team_id, u.avatar, u.status,
           t.name as team_name,
           (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status != 'completed') as active_tasks_count,
           (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'completed') as completed_tasks_count
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    ORDER BY 
      CASE u.role 
        WHEN 'founder' THEN 1 
        WHEN 'team_lead' THEN 2 
        WHEN 'employee' THEN 3 
      END, u.name ASC
  `).all();
  res.json(users);
});

// FOUNDER: List pending employee access requests
router.get('/access-requests', authMiddleware, requireRoles('founder'), (req, res) => {
  const pendingUsers = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.team_id, u.avatar, u.created_at,
           t.name as team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.status = 'pending'
    ORDER BY u.created_at DESC
  `).all();
  res.json(pendingUsers);
});

// FOUNDER: Approve an employee access request
router.post('/access-requests/:id/approve', authMiddleware, requireRoles('founder'), (req, res) => {
  const userId = req.params.id;
  const { role, team_id, department, title } = req.body;

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User request not found' });
  }

  const finalRole = role || targetUser.role;
  const finalTeamId = team_id !== undefined ? team_id : targetUser.team_id;
  const finalDept = department || targetUser.department;
  const finalTitle = title || targetUser.title;

  db.prepare(`
    UPDATE users
    SET status = 'approved',
        role = ?,
        team_id = ?,
        department = ?,
        title = ?
    WHERE id = ?
  `).run(finalRole, finalTeamId, finalDept, finalTitle, userId);

  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Discipl Company Access Verified', 'The Founder has verified your membership and granted full access!', 'access_approved')
    `).run(userId);
  } catch (err) {
    console.error(err);
  }

  if (req.io) {
    req.io.emit('access_request_updated', { userId: Number(userId), status: 'approved' });
    req.io.emit('access_approved', { userId: Number(userId), status: 'approved' });
  }

  res.json({ message: `Access approved for ${targetUser.name}!` });
});

// FOUNDER: Reject an employee access request
router.post('/access-requests/:id/reject', authMiddleware, requireRoles('founder'), (req, res) => {
  const userId = req.params.id;
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User request not found' });
  }

  db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(userId);

  if (req.io) {
    req.io.emit('access_request_updated', { userId: Number(userId), status: 'rejected' });
  }

  res.json({ message: `Access request from ${targetUser.name} was rejected.` });
});

// FOUNDER: Direct Invite / Add Employee
router.post('/invite-user', authMiddleware, requireRoles('founder'), (req, res) => {
  const { name, email, password, role, title, department, team_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const avatar = generateStaticAvatar(name, role);

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, title, department, team_id, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')
  `).run(
    name.trim(),
    cleanEmail,
    hashedPassword,
    role,
    title ? title.trim() : (role === 'team_lead' ? 'Team Lead' : 'Employee'),
    department ? department.trim() : 'General',
    team_id ? Number(team_id) : null,
    avatar
  );

  const newUser = db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(result.lastInsertRowid);

  if (req.io) {
    req.io.emit('user_added', newUser);
  }

  res.status(201).json({ message: `Employee ${name} added successfully!`, user: newUser });
});

// FOUNDER: Revoke Access or Delete User
router.delete('/users/:id', authMiddleware, requireRoles('founder'), (req, res) => {
  const userId = req.params.id;
  if (Number(userId) === req.user.id) {
    return res.status(400).json({ error: 'Founder cannot delete their own account' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  if (req.io) {
    req.io.emit('user_removed', { userId: Number(userId) });
  }

  res.json({ message: 'User access revoked and deleted' });
});

// Teams list
router.get('/teams', authMiddleware, (req, res) => {
  const teams = db.prepare(`
    SELECT t.id, t.name, t.description, t.lead_id,
           u.name as lead_name, u.avatar as lead_avatar,
           (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count,
           (SELECT COUNT(*) FROM tasks WHERE team_id = t.id) as task_count
    FROM teams t
    LEFT JOIN users u ON t.lead_id = u.id
    ORDER BY t.name ASC
  `).all();
  res.json(teams);
});

module.exports = router;
