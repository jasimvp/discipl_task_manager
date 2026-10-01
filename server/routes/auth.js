const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { generateToken, authMiddleware, requireRoles } = require('../auth');

// Check setup status (always false to allow normal sign-in / registration)
router.get('/setup-status', async (req, res) => {
  try {
    const userCountRow = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    const userCount = Number(userCountRow?.count || 0);
    res.json({
      needsFounderSetup: false,
      totalUsers: userCount,
    });
  } catch (err) {
    console.error('Error in setup-status:', err);
    res.json({ needsFounderSetup: false, totalUsers: 0 });
  }
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
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, title, department, team_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
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
      await db.prepare('DELETE FROM company_invites WHERE email = ?').run(cleanEmail);
    } catch (e) {}

    let finalTeamId = team_id ? Number(team_id) : null;
    if (!finalTeamId && targetDept) {
      const matchingTeam = await db.prepare('SELECT id FROM teams WHERE name = ?').get(targetDept);
      if (matchingTeam) finalTeamId = matchingTeam.id;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const avatar = generateStaticAvatar(name, targetRole);

    const stmt = db.prepare(`
      INSERT INTO users (name, email, password, role, title, department, team_id, avatar, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      name.trim(),
      cleanEmail,
      hashedPassword,
      targetRole,
      targetTitle.trim(),
      targetDept.trim(),
      finalTeamId,
      avatar,
      userStatus
    );

    const newUserId = result.lastInsertRowid;

    // If registering as Team Lead, assign as team lead if not already assigned
    if (targetRole === 'team_lead' && finalTeamId) {
      try {
        await db.prepare('UPDATE teams SET lead_id = ? WHERE id = ? AND lead_id IS NULL').run(newUserId, finalTeamId);
      } catch (e) {}
    }

    const newUser = await db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(newUserId);
    const token = generateToken(newUser);

    if (req.io) {
      req.io.emit('user_added', newUser);
    }

    res.status(201).json({
      token,
      user: newUser,
      message: 'Welcome to Discipl! Your account is active.',
    });
  } catch (err) {
    console.error('Error in registration:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.prepare(`
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
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// List all active approved users (scoped to team members & founders for non-founders)
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.team_id, u.avatar, u.status,
             t.name as team_name,
             (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status != 'completed') as active_tasks_count,
             (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'completed') as completed_tasks_count
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.status = 'approved'
    `;
    const params = [];

    // Team-based user privacy:
    // Non-founders only see founders and members of their own team!
    if (user.role !== 'founder') {
      query += ` AND (u.role = 'founder' OR u.team_id = ?)`;
      params.push(user.team_id || 0);
    }

    query += ` ORDER BY 
      CASE u.role 
        WHEN 'founder' THEN 1 
        WHEN 'team_lead' THEN 2 
        WHEN 'employee' THEN 3 
      END, u.name ASC`;

    const users = await db.prepare(query).all(...params);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// FOUNDER: List pending registered users waiting to be linked
router.get(['/access-requests', '/pending-users'], authMiddleware, requireRoles('founder'), async (req, res) => {
  try {
    const pendingUsers = await db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.team_id, u.avatar, u.created_at,
             t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.status IN ('pending', 'pending_approval')
      ORDER BY u.created_at DESC
    `).all();
    res.json(pendingUsers);
  } catch (err) {
    console.error('Error fetching pending users:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// FOUNDER: List pre-authorized company email invites
router.get('/company-invites', authMiddleware, requireRoles('founder'), async (req, res) => {
  try {
    const invites = await db.prepare(`
      SELECT ci.*, u.name as inviter_name
      FROM company_invites ci
      LEFT JOIN users u ON ci.created_by = u.id
      ORDER BY ci.created_at DESC
    `).all();
    res.json(invites);
  } catch (err) {
    console.error('Error fetching company invites:', err);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// FOUNDER: Delete / cancel a pre-authorized email invite
router.delete('/company-invites/:id', authMiddleware, requireRoles('founder'), async (req, res) => {
  try {
    await db.prepare('DELETE FROM company_invites WHERE id = ?').run(req.params.id);
    res.json({ message: 'Pre-authorized email invitation cancelled' });
  } catch (err) {
    console.error('Error deleting company invite:', err);
    res.status(500).json({ error: 'Failed to cancel invite' });
  }
});

// FOUNDER: Approve / link an employee request
router.post('/access-requests/:id/approve', authMiddleware, requireRoles('founder'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { role, team_id, department, title } = req.body;

    const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User request not found' });
    }

    const finalRole = role || targetUser.role;
    const finalTeamId = team_id !== undefined ? team_id : targetUser.team_id;
    const finalDept = department || targetUser.department;
    const finalTitle = title || targetUser.title;

    await db.prepare(`
      UPDATE users
      SET status = 'approved',
          role = ?,
          team_id = ?,
          department = ?,
          title = ?
      WHERE id = ?
    `).run(finalRole, finalTeamId, finalDept, finalTitle, userId);

    try {
      await db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Discipl Company Access Verified', 'The Founder has verified your membership and granted full access!', 'access_approved')
      `).run(userId);
    } catch (err) {}

    if (req.io) {
      req.io.emit('access_request_updated', { userId: Number(userId), status: 'approved' });
      req.io.emit('access_approved', { userId: Number(userId), status: 'approved' });
    }

    res.json({ message: `Access approved for ${targetUser.name}!` });
  } catch (err) {
    console.error('Error approving request:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// FOUNDER: Reject an employee access request
router.post('/access-requests/:id/reject', authMiddleware, requireRoles('founder'), async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User request not found' });
    }

    await db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(userId);

    if (req.io) {
      req.io.emit('access_request_updated', { userId: Number(userId), status: 'rejected' });
    }

    res.json({ message: `Access request from ${targetUser.name} was rejected.` });
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// FOUNDER & TEAM LEAD: Add / Link Employee to Company / Team by Email
router.post(['/invite-user', '/add-employee'], authMiddleware, requireRoles('founder', 'team_lead'), async (req, res) => {
  try {
    const { email, role, title, department, team_id, name, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Employee work email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isLead = req.user.role === 'team_lead';

    // Team Leads can only add employees to their own team
    const targetRole = isLead ? 'employee' : (role || 'employee');
    const targetDept = isLead ? (req.user.department || 'Engineering & Tech') : (department || 'Engineering & Tech');
    let finalTeamId = isLead ? req.user.team_id : (team_id ? Number(team_id) : null);
    if (!finalTeamId && targetDept) {
      const t = await db.prepare('SELECT id FROM teams WHERE name = ?').get(targetDept);
      if (t) finalTeamId = t.id;
    }
    const targetTitle = title || (targetRole === 'founder' ? 'Co-Founder' : targetRole === 'team_lead' ? 'Team Lead' : 'Software Engineer');

    // Check if user is already registered in Discipl
    const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (existingUser) {
      if (existingUser.status === 'approved') {
        // If user has no team, Team Lead can claim them into their team!
        if (isLead && !existingUser.team_id) {
          await db.prepare('UPDATE users SET team_id = ?, department = ? WHERE id = ?').run(finalTeamId, targetDept, existingUser.id);
          const updated = await db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(existingUser.id);
          if (req.io) req.io.emit('user_added', updated);
          return res.json({ message: `${existingUser.name} has been added to your team!`, user: updated, linkedExisting: true });
        }
        return res.status(400).json({ error: `User with email "${cleanEmail}" is already an active member of Discipl.` });
      }

      // User is currently pending - Link and approve them immediately!
      await db.prepare(`
        UPDATE users
        SET status = 'approved',
            role = ?,
            department = ?,
            title = ?,
            team_id = COALESCE(?, team_id)
        WHERE id = ?
      `).run(targetRole, targetDept, targetTitle, finalTeamId, existingUser.id);

      try {
        await db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, 'Discipl Workspace Linked', 'You have been linked and approved for the Discipl workspace!', 'access_approved')
        `).run(existingUser.id);
      } catch (e) {}

      const updatedUser = await db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(existingUser.id);

      if (req.io) {
        req.io.emit('access_approved', { userId: existingUser.id, status: 'approved' });
        req.io.emit('user_added', updatedUser);
      }

      return res.json({
        message: `Employee ${existingUser.name} (${cleanEmail}) has been linked and approved for the team!`,
        user: updatedUser,
        linkedExisting: true
      });
    }

    // If password provided, directly create approved account!
    if (password && password.trim()) {
      const hashedPassword = bcrypt.hashSync(password.trim(), 10);
      const memberName = name && name.trim() ? name.trim() : cleanEmail.split('@')[0];
      const avatar = generateStaticAvatar(memberName, targetRole);

      const result = await db.prepare(`
        INSERT INTO users (name, email, password, role, title, department, team_id, avatar, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')
      `).run(memberName, cleanEmail, hashedPassword, targetRole, targetTitle, targetDept, finalTeamId, avatar);

      const newUser = await db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(result.lastInsertRowid);
      if (req.io) {
        req.io.emit('user_added', newUser);
      }
      return res.status(201).json({
        message: `Team member ${newUser.name} (${cleanEmail}) has been created and added to the team!`,
        user: newUser,
        linkedExisting: false
      });
    }

    // Pre-authorize invite
    const existingInvite = await db.prepare('SELECT id FROM company_invites WHERE email = ?').get(cleanEmail);
    if (existingInvite) {
      await db.prepare(`
        UPDATE company_invites
        SET role = ?, department = ?, title = ?, created_by = ?
        WHERE id = ?
      `).run(targetRole, targetDept, targetTitle, req.user.id, existingInvite.id);
    } else {
      await db.prepare(`
        INSERT INTO company_invites (email, role, department, title, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanEmail, targetRole, targetDept, targetTitle, req.user.id);
    }

    res.status(201).json({
      message: `Email "${cleanEmail}" is now pre-authorized for your team! As soon as the employee registers, they will be automatically placed in your team.`,
      invite: {
        email: cleanEmail,
        role: targetRole,
        department: targetDept,
        title: targetTitle
      },
      linkedExisting: false
    });
  } catch (err) {
    console.error('Error adding/inviting employee:', err);
    res.status(500).json({ error: 'Failed to process employee invite' });
  }
});

// FOUNDER & TEAM LEAD: Get unassigned employees available to be added to team
router.get('/unassigned-employees', authMiddleware, requireRoles('founder', 'team_lead'), async (req, res) => {
  try {
    const users = await db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.avatar
      FROM users u
      WHERE u.status = 'approved' AND u.role = 'employee' AND (u.team_id IS NULL OR u.team_id = 0)
      ORDER BY u.name ASC
    `).all();
    res.json(users);
  } catch (err) {
    console.error('Error fetching unassigned employees:', err);
    res.status(500).json({ error: 'Failed to fetch unassigned employees' });
  }
});

// FOUNDER & TEAM LEAD: Add existing unassigned employee to team
router.post('/teams/add-existing-member', authMiddleware, requireRoles('founder', 'team_lead'), async (req, res) => {
  try {
    const { user_id, team_id } = req.body;
    const caller = req.user;

    const targetTeamId = caller.role === 'team_lead' ? caller.team_id : (team_id ? Number(team_id) : caller.team_id);
    if (!targetTeamId) {
      return res.status(400).json({ error: 'Please specify a valid team' });
    }

    const team = await db.prepare('SELECT * FROM teams WHERE id = ?').get(targetTeamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(Number(user_id));
    if (!targetUser) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await db.prepare(`
      UPDATE users
      SET team_id = ?, department = ?
      WHERE id = ?
    `).run(targetTeamId, team.name, targetUser.id);

    const updatedUser = await db.prepare('SELECT id, name, email, role, title, department, team_id, avatar, status FROM users WHERE id = ?').get(targetUser.id);

    if (req.io) {
      req.io.emit('user_added', updatedUser);
    }

    res.json({
      message: `${targetUser.name} has been added to ${team.name}!`,
      user: updatedUser
    });
  } catch (err) {
    console.error('Error adding existing member to team:', err);
    res.status(500).json({ error: 'Failed to add member to team' });
  }
});

// FOUNDER: Revoke Access or Delete User
router.delete('/users/:id', authMiddleware, requireRoles('founder'), async (req, res) => {
  try {
    const userId = req.params.id;
    if (Number(userId) === req.user.id) {
      return res.status(400).json({ error: 'Founder cannot delete their own account' });
    }

    await db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    if (req.io) {
      req.io.emit('user_removed', { userId: Number(userId) });
    }

    res.json({ message: 'User access revoked and deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Teams list (Founder sees all, Team Lead & Employee see their team)
router.get('/teams', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT t.id, t.name, t.description, t.lead_id,
             u.name as lead_name, u.avatar as lead_avatar,
             (SELECT COUNT(*) FROM users WHERE team_id = t.id) as member_count,
             (SELECT COUNT(*) FROM tasks WHERE team_id = t.id) as task_count
      FROM teams t
      LEFT JOIN users u ON t.lead_id = u.id
    `;
    const params = [];

    if (user.role !== 'founder') {
      query += ` WHERE t.id = ?`;
      params.push(user.team_id || 0);
    }

    query += ` ORDER BY t.name ASC`;
    const teams = await db.prepare(query).all(...params);
    res.json(teams);
  } catch (err) {
    console.error('Error fetching teams:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

module.exports = router;
