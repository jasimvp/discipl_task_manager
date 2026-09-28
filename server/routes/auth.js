const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { generateToken, authMiddleware, requireRoles } = require('../auth');

// Register / Request Access
router.post('/register', (req, res) => {
  const { name, email, password, role, title, department, team_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  // Check if email already exists
  const existing = db.prepare('SELECT id, status FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    if (existing.status === 'pending') {
      return res.status(400).json({ error: 'An access request with this email is already pending Founder approval.' });
    }
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  // Random avatar selection for profile
  const avatarPool = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  ];
  const avatar = avatarPool[Math.floor(Math.random() * avatarPool.length)];

  // For Founders: if registering as founder and none exists, auto-approve; otherwise founder registration is auto-approved or reviewed
  const founderCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'founder' AND status = 'approved'").get().count;
  const isFirstFounder = role === 'founder' && founderCount === 0;

  // Employees and Team Leads MUST be approved by Founder
  const initialStatus = isFirstFounder ? 'approved' : role === 'founder' ? 'approved' : 'pending';

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password, role, title, department, team_id, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name.trim(),
    email.toLowerCase().trim(),
    hashedPassword,
    role,
    title ? title.trim() : (role === 'team_lead' ? 'Team Lead' : 'Employee'),
    department ? department.trim() : 'General',
    team_id ? Number(team_id) : null,
    avatar,
    initialStatus
  );

  const newUserId = result.lastInsertRowid;

  if (initialStatus === 'pending') {
    // Notify all Founders that an employee requested access
    const founders = db.prepare("SELECT id FROM users WHERE role = 'founder' AND status = 'approved'").all();
    for (const f of founders) {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'access_request')
        `).run(
          f.id,
          'New Employee Access Request',
          `${name.trim()} requested access as ${role === 'team_lead' ? 'Team Lead' : 'Employee'} in ${department || 'General'}`
        );
      } catch (err) {
        console.error(err);
      }
    }

    if (req.io) {
      req.io.emit('new_access_request', {
        id: newUserId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        department,
      });
    }

    return res.status(201).json({
      pending: true,
      message: 'Access request submitted! Your account is awaiting Founder approval. Once approved, you can log in.',
    });
  }

  // If approved (e.g. founder)
  const newUser = db.prepare('SELECT id, name, email, role, title, department, avatar, status FROM users WHERE id = ?').get(newUserId);
  const token = generateToken(newUser);
  res.status(201).json({ token, user: newUser, message: 'Account registered and approved!' });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check approval status
  if (user.status === 'pending') {
    return res.status(403).json({
      error: 'Your access request is currently pending Founder approval. You will be able to sign in once the Founder grants access.',
      pending: true,
    });
  }

  if (user.status === 'rejected') {
    return res.status(403).json({
      error: 'Your access request was declined by the Founder. Please contact your administrator.',
      rejected: true,
    });
  }

  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
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

// List all approved users (for assignees, contacts, teams)
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

  // Notify user
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Access Approved', 'Welcome! Your company account has been approved by the Founder.', 'access_approved')
    `).run(userId);
  } catch (err) {
    console.error(err);
  }

  // Real-time broadcast
  if (req.io) {
    req.io.emit('access_request_updated', { userId, status: 'approved' });
  }

  res.json({ message: `Access granted to ${targetUser.name}! They can now log in.` });
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
    req.io.emit('access_request_updated', { userId, status: 'rejected' });
  }

  res.json({ message: `Access request from ${targetUser.name} was rejected.` });
});

// FOUNDER: Direct Invite / Add Employee (Instantly approved)
router.post('/invite-user', authMiddleware, requireRoles('founder'), (req, res) => {
  const { name, email, password, role, title, department, team_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, title, department, team_id, avatar, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')
  `).run(
    name.trim(),
    email.toLowerCase().trim(),
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
    req.io.emit('user_removed', { userId });
  }

  res.json({ message: 'User access revoked and deleted' });
});

// Teams list
router.get('/teams', authMiddleware, (req, res) => {
  const teams = db.prepare(`
    SELECT t.id, t.name, t.description, t.lead_id,
           u.name as lead_name, u.avatar as lead_avatar,
           (SELECT COUNT(*) FROM users WHERE team_id = t.id AND status = 'approved') as member_count,
           (SELECT COUNT(*) FROM tasks WHERE team_id = t.id) as task_count
    FROM teams t
    LEFT JOIN users u ON t.lead_id = u.id
    ORDER BY t.name ASC
  `).all();
  res.json(teams);
});

module.exports = router;
