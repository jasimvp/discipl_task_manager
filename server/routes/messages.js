const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../auth');

// Get team channel messages (Direct messages never appear here!)
router.get('/team/:teamId', authMiddleware, (req, res) => {
  const teamId = Number(req.params.teamId);
  const user = req.user;

  // Non-founders can only read messages from their own team channel
  if (user.role !== 'founder' && user.team_id !== teamId) {
    return res.status(403).json({ error: 'You do not have access to another team channel.' });
  }

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role, u.title as sender_title
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.team_id = ? AND m.recipient_id IS NULL
    ORDER BY m.created_at ASC
  `).all(teamId);

  res.json(messages);
});

// Get direct messages between current user and another user
router.get('/direct/:otherUserId', authMiddleware, (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = Number(req.params.otherUserId);
  const user = req.user;

  // Non-founders can only direct message founders or members of their own team
  if (user.role !== 'founder') {
    const otherUser = db.prepare('SELECT role, team_id FROM users WHERE id = ?').get(otherUserId);
    if (!otherUser || (otherUser.role !== 'founder' && otherUser.team_id !== user.team_id)) {
      return res.status(403).json({ error: 'You can only message members of your own team or founders.' });
    }
  }

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role, u.title as sender_title
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE ((m.sender_id = ? AND m.recipient_id = ?)
        OR (m.sender_id = ? AND m.recipient_id = ?))
       AND m.team_id IS NULL
    ORDER BY m.created_at ASC
  `).all(currentUserId, otherUserId, otherUserId, currentUserId);

  res.json(messages);
});

// Send a message (Direct Message vs Team Channel strictly isolated)
router.post('/', authMiddleware, (req, res) => {
  const senderId = req.user.id;
  const user = req.user;
  const { recipient_id, team_id, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  let finalRecipientId = recipient_id ? Number(recipient_id) : null;
  let finalTeamId = team_id ? Number(team_id) : null;

  // Strict isolation: A direct message must NEVER have a team_id, and vice versa!
  if (finalRecipientId) {
    finalTeamId = null;

    if (user.role !== 'founder') {
      const otherUser = db.prepare('SELECT role, team_id FROM users WHERE id = ?').get(finalRecipientId);
      if (!otherUser || (otherUser.role !== 'founder' && otherUser.team_id !== user.team_id)) {
        return res.status(403).json({ error: 'You cannot direct message users outside your team.' });
      }
    }
  } else if (finalTeamId) {
    finalRecipientId = null;

    if (user.role !== 'founder' && user.team_id !== finalTeamId) {
      return res.status(403).json({ error: 'You cannot post to another team channel.' });
    }
  } else {
    return res.status(400).json({ error: 'Either recipient_id or team_id must be provided' });
  }

  const stmt = db.prepare(`
    INSERT INTO messages (sender_id, recipient_id, team_id, content)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    senderId,
    finalRecipientId,
    finalTeamId,
    content.trim()
  );

  const newMsg = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role, u.title as sender_title
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  // If direct message, send notification to recipient
  if (finalRecipientId) {
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'message')
      `).run(
        finalRecipientId,
        `New Message from ${user.name}`,
        content.trim().length > 60 ? content.trim().substring(0, 57) + '...' : content.trim()
      );
    } catch (e) {
      console.error('Error adding message notification:', e);
    }
  }

  // Socket.io emit
  if (req.io) {
    if (finalTeamId) {
      req.io.to(`team_${finalTeamId}`).emit('new_message', newMsg);
    } else if (finalRecipientId) {
      req.io.to(`user_${finalRecipientId}`).emit('new_message', newMsg);
      req.io.to(`user_${senderId}`).emit('new_message', newMsg);
    }
  }

  res.status(201).json(newMsg);
});

// List conversation contacts / recent chats for user (team-filtered)
router.get('/conversations', authMiddleware, (req, res) => {
  const currentUserId = req.user.id;
  const user = req.user;

  let query = `
    SELECT u.id, u.name, u.email, u.role, u.title, u.avatar, u.department,
           t.name as team_name,
           (SELECT content FROM messages 
            WHERE ((sender_id = u.id AND recipient_id = ?) 
               OR (sender_id = ? AND recipient_id = u.id))
              AND team_id IS NULL
            ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages 
            WHERE ((sender_id = u.id AND recipient_id = ?) 
               OR (sender_id = ? AND recipient_id = u.id))
              AND team_id IS NULL
            ORDER BY created_at DESC LIMIT 1) as last_message_time
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.id != ? AND u.status = 'approved'
  `;
  const params = [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId];

  // Team-based contact privacy: non-founders only see founders or teammates in their own team
  if (user.role !== 'founder') {
    query += ` AND (u.role = 'founder' OR u.team_id = ?)`;
    params.push(user.team_id || 0);
  }

  query += ` ORDER BY last_message_time DESC NULLS LAST, u.name ASC`;

  const contacts = db.prepare(query).all(...params);
  res.json(contacts);
});

module.exports = router;
