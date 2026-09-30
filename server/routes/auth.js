const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { generateToken, authMiddleware, requireRoles } = require('../auth');

// Check setup status (always false to allow normal sign-in / registration)
router.get('/setup-status', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  res.json({
    needsFounderSetup: false,
    totalUsers: userCount,
  });
});

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

// Register - Users register themselves with their own chosen role and password
router.post('/register', (req, res) => {
  const { name, email, password, role, title, department, team_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  // Support direct role selection: founder, team_lead, or employee
  let targetRole = role || 'employee';
  if (!['founder', 'team_lead', 'employee'].includes(targetRole)) {
    targetRole = 'employee';
  }

  let targetDept = department || (targetRole === 'founder' ? 'Executive Leadership' : 'Engineering & Tech');
  let targetTitle = title || (
    targetRole === 'founder' ? 'Founder & CEO' :
    targetRole === 'team_lead' ? 'Team Lead' : 'Software Engineer'
  );

  // Directly approve all registered accounts with their chosen role
  const userStatus = 'approved';

  // Consume any company invite if one was pre-created for this email
  try {
    db.prepare('DELETE FROM company_invites WHERE email = ?').run(cleanEmail);
  } catch (e) {}

  const hashedPassword = bcrypt.hashSync(password, 10);
  const avatar = generateStaticAvatar(name, targetRole);

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password, role, title, department, team_id, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name.trim(),
    cleanEmail,
    hashedPassword,
    targetRole,
    targetTitle.trim(),
    targetDept.trim(),
    team_id ? Number(team_id) : null,
    avatar,
    userStatus
  );

  const newUserId = result.lastInsertRowid;
  const newUser = db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(newUserId);
  const token = generateToken(newUser);

  if (req.io) {
    req.io.emit('user_added', newUser);
  }

  res.status(201).json({
    token,
    user: newUser,
    message: 'Welcome to Discipl! Your account is active.',
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

// List all active approved users
router.get('/users', authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.team_id, u.avatar, u.status,
           t.name as team_name,
           (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status != 'completed') as active_tasks_count,
           (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'completed') as completed_tasks_count
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.status = 'approved'
    ORDER BY 
      CASE u.role 
        WHEN 'founder' THEN 1 
        WHEN 'team_lead' THEN 2 
        WHEN 'employee' THEN 3 
      END, u.name ASC
  `).all();
  res.json(users);
});

// FOUNDER: List pending registered users waiting to be linked
router.get(['/access-requests', '/pending-users'], authMiddleware, requireRoles('founder'), (req, res) => {
  const pendingUsers = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.team_id, u.avatar, u.created_at,
           t.name as team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.status IN ('pending', 'pending_approval')
    ORDER BY u.created_at DESC
  `).all();
  res.json(pendingUsers);
});

// FOUNDER: List pre-authorized company email invites
router.get('/company-invites', authMiddleware, requireRoles('founder'), (req, res) => {
  const invites = db.prepare(`
    SELECT ci.*, u.name as inviter_name
    FROM company_invites ci
    LEFT JOIN users u ON ci.created_by = u.id
    ORDER BY ci.created_at DESC
  `).all();
  res.json(invites);
});

// FOUNDER: Delete / cancel a pre-authorized email invite
router.delete('/company-invites/:id', authMiddleware, requireRoles('founder'), (req, res) => {
  db.prepare('DELETE FROM company_invites WHERE id = ?').run(req.params.id);
  res.json({ message: 'Pre-authorized email invitation cancelled' });
});

// FOUNDER: Approve / link an employee request
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

// FOUNDER: Add / Link Employee to Company by Email (No password required!)
router.post(['/invite-user', '/add-employee'], authMiddleware, requireRoles('founder'), (req, res) => {
  const { email, role, title, department, team_id, name } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Employee work email is required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const targetRole = role || 'employee';
  const targetDept = department || 'Engineering & Tech';
  const targetTitle = title || (targetRole === 'founder' ? 'Co-Founder' : targetRole === 'team_lead' ? 'Team Lead' : 'Software Engineer');

  // Check if user is already registered in Discipl
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

  if (existingUser) {
    if (existingUser.status === 'approved') {
      return res.status(400).json({ error: `User with email "${cleanEmail}" is already an active member of Discipl.` });
    }

    // User is currently pending - Founder links and approves them immediately!
    db.prepare(`
      UPDATE users
      SET status = 'approved',
          role = ?,
          department = ?,
          title = ?,
          team_id = COALESCE(?, team_id)
      WHERE id = ?
    `).run(targetRole, targetDept, targetTitle, team_id ? Number(team_id) : null, existingUser.id);

    try {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Discipl Workspace Linked', 'The Founder has linked your email and approved your workspace access!', 'access_approved')
      `).run(existingUser.id);
    } catch (e) {}

    const updatedUser = db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(existingUser.id);

    if (req.io) {
      req.io.emit('access_approved', { userId: existingUser.id, status: 'approved' });
      req.io.emit('user_added', updatedUser);
    }

    return res.json({
      message: `Employee ${existingUser.name} (${cleanEmail}) has been linked and approved for the Discipl workspace!`,
      user: updatedUser,
      linkedExisting: true
    });
  }

  // User has not registered yet: Pre-authorize their email in company_invites!
  // When they register with their own password, they will be instantly approved into the workspace.
  const existingInvite = db.prepare('SELECT id FROM company_invites WHERE email = ?').get(cleanEmail);
  if (existingInvite) {
    db.prepare(`
      UPDATE company_invites
      SET role = ?, department = ?, title = ?, created_by = ?
      WHERE id = ?
    `).run(targetRole, targetDept, targetTitle, req.user.id, existingInvite.id);
  } else {
    db.prepare(`
      INSERT INTO company_invites (email, role, department, title, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(cleanEmail, targetRole, targetDept, targetTitle, req.user.id);
  }

  res.status(201).json({
    message: `Email "${cleanEmail}" is now pre-authorized for Discipl! As soon as the employee registers with this email, they will automatically be linked with active access.`,
    invite: {
      email: cleanEmail,
      role: targetRole,
      department: targetDept,
      title: targetTitle
    },
    linkedExisting: false
  });
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
