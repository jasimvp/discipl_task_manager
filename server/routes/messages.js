const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../auth');

// Get team channel messages
router.get('/team/:teamId', authMiddleware, (req, res) => {
  const teamId = req.params.teamId;
  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role, u.title as sender_title
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.team_id = ?
    ORDER BY m.created_at ASC
  `).all(teamId);

  res.json(messages);
});

// Get direct messages between current user and another user
router.get('/direct/:otherUserId', authMiddleware, (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.otherUserId;

  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role, u.title as sender_title
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.recipient_id = ?)
       OR (m.sender_id = ? AND m.recipient_id = ?)
    ORDER BY m.created_at ASC
  `).all(currentUserId, otherUserId, otherUserId, currentUserId);

  res.json(messages);
});

// Send a message (works for both team and direct)
router.post('/', authMiddleware, (req, res) => {
  const senderId = req.user.id;
  const { recipient_id, team_id, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  if (!recipient_id && !team_id) {
    return res.status(400).json({ error: 'Either recipient_id or team_id must be provided' });
  }

  const stmt = db.prepare(`
    INSERT INTO messages (sender_id, recipient_id, team_id, content)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    senderId,
    recipient_id || null,
    team_id || null,
    content.trim()
  );

  const newMsg = db.prepare(`
    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role, u.title as sender_title
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  // If direct message, send notification to recipient
  if (recipient_id) {
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'message')
      `).run(
        recipient_id,
        `New Message from ${req.user.name}`,
        content.trim().length > 60 ? content.trim().substring(0, 57) + '...' : content.trim()
      );
    } catch (e) {
      console.error('Error adding message notification:', e);
    }
  }

  // Socket.io emit is handled in server/index.js if attached
  if (req.io) {
    if (team_id) {
      req.io.to(`team_${team_id}`).emit('new_message', newMsg);
    } else if (recipient_id) {
      req.io.to(`user_${recipient_id}`).emit('new_message', newMsg);
      req.io.to(`user_${senderId}`).emit('new_message', newMsg);
    }
  }

  res.status(201).json(newMsg);
});

// List conversation contacts / recent chats for user
router.get('/conversations', authMiddleware, (req, res) => {
  const currentUserId = req.user.id;

  // Get all users except current
  const contacts = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.title, u.avatar, u.department,
           t.name as team_name,
           (SELECT content FROM messages 
            WHERE (sender_id = u.id AND recipient_id = ?) 
               OR (sender_id = ? AND recipient_id = u.id)
            ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT created_at FROM messages 
            WHERE (sender_id = u.id AND recipient_id = ?) 
               OR (sender_id = ? AND recipient_id = u.id)
            ORDER BY created_at DESC LIMIT 1) as last_message_time
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    WHERE u.id != ?
    ORDER BY last_message_time DESC NULLS LAST, u.name ASC
  `).all(currentUserId, currentUserId, currentUserId, currentUserId, currentUserId);

  res.json(contacts);
});

module.exports = router;
