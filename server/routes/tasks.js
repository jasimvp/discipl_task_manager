const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../auth');

// Helper to record activity
function recordActivity(taskId, userId, activityType, details) {
  try {
    db.prepare(`
      INSERT INTO task_activities (task_id, user_id, activity_type, details)
      VALUES (?, ?, ?, ?)
    `).run(taskId, userId, activityType, details);
  } catch (e) {
    console.error('Failed to record activity:', e);
  }
}

// Helper to add notification
function addNotification(userId, title, message, type, taskId) {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, task_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, title, message, type, taskId);
  } catch (e) {
    console.error('Failed to add notification:', e);
  }
}

// GET all tasks (with filters: status, priority, assigned_to, search, team_id, rejection_status)
router.get('/', authMiddleware, (req, res) => {
  const { status, priority, assigned_to, team_id, rejection_only, search } = req.query;
  const user = req.user;

  let query = `
    SELECT t.*,
           assignee.name as assignee_name, assignee.avatar as assignee_avatar, assignee.role as assignee_role, assignee.title as assignee_title,
           creator.name as creator_name, creator.avatar as creator_avatar,
           tm.name as team_name
    FROM tasks t
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    LEFT JOIN users creator ON t.assigned_by = creator.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    WHERE 1=1
  `;
  const params = [];

  // Role-based visibility:
  if (user.role === 'employee') {
    if (assigned_to) {
      query += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    } else {
      query += ` AND (t.assigned_to = ? OR t.team_id = ?)`;
      params.push(user.id, user.team_id || 0);
    }
  } else if (user.role === 'team_lead') {
    if (assigned_to) {
      query += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    }
  } else if (user.role === 'founder') {
    if (assigned_to) {
      query += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    }
  }

  if (status) {
    query += ` AND t.status = ?`;
    params.push(status);
  }

  if (priority) {
    query += ` AND t.priority = ?`;
    params.push(priority);
  }

  if (team_id) {
    query += ` AND t.team_id = ?`;
    params.push(team_id);
  }

  if (rejection_only === 'true') {
    query += ` AND t.rejection_status = 'requested'`;
  }

  if (req.query.overdue_only === 'true') {
    const today = new Date().toISOString().split('T')[0];
    query += ` AND t.due_date IS NOT NULL AND t.due_date < ? AND t.status != 'completed'`;
    params.push(today);
  }

  if (search) {
    query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY 
    CASE t.rejection_status WHEN 'requested' THEN 1 ELSE 2 END,
    CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
    t.due_date ASC, t.created_at DESC`;

  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});

// GET single task by ID
router.get('/:id', authMiddleware, (req, res) => {
  const task = db.prepare(`
    SELECT t.*,
           assignee.name as assignee_name, assignee.avatar as assignee_avatar, assignee.role as assignee_role, assignee.title as assignee_title, assignee.email as assignee_email,
           creator.name as creator_name, creator.avatar as creator_avatar,
           tm.name as team_name
    FROM tasks t
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    LEFT JOIN users creator ON t.assigned_by = creator.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Get activities
  const activities = db.prepare(`
    SELECT a.*, u.name as user_name, u.avatar as user_avatar
    FROM task_activities a
    JOIN users u ON a.user_id = u.id
    WHERE a.task_id = ?
    ORDER BY a.created_at DESC
  `).all(req.params.id);

  // Get discussion comments
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role, u.title as user_title
    FROM task_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);

  res.json({ ...task, activities, comments });
});

// CREATE task (Founders and Team Leads)
router.post('/', authMiddleware, (req, res) => {
  const user = req.user;
  if (user.role !== 'founder' && user.role !== 'team_lead') {
    return res.status(403).json({ error: 'Only Founders and Team Leaders can assign tasks' });
  }

  const { title, description, priority, assigned_to, team_id, due_date } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  let finalTeamId = team_id;
  if (!finalTeamId && assigned_to) {
    const assignee = db.prepare('SELECT team_id FROM users WHERE id = ?').get(assigned_to);
    if (assignee) finalTeamId = assignee.team_id;
  }

  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assigned_to, assigned_by, team_id, due_date, progress_pct, rejection_status)
    VALUES (?, ?, 'todo', ?, ?, ?, ?, ?, 0, 'none')
  `);

  const result = stmt.run(
    title.trim(),
    description || '',
    priority || 'medium',
    assigned_to || null,
    user.id,
    finalTeamId || null,
    due_date || null
  );

  const taskId = result.lastInsertRowid;

  // Record activity
  recordActivity(taskId, user.id, 'task_created', `Task created and assigned by ${user.name}`);

  // Notify assignee
  if (assigned_to && assigned_to !== user.id) {
    addNotification(
      assigned_to,
      'New Task Assigned',
      `${user.name} assigned you a new task: "${title.trim()}"`,
      'task_assigned',
      taskId
    );
  }

  const newTask = db.prepare(`
    SELECT t.*,
           assignee.name as assignee_name, assignee.avatar as assignee_avatar,
           creator.name as creator_name
    FROM tasks t
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    LEFT JOIN users creator ON t.assigned_by = creator.id
    WHERE t.id = ?
  `).get(taskId);

  // Real-time broadcast
  if (req.io) {
    req.io.emit('task_created', newTask);
  }

  res.status(201).json(newTask);
});

// UPDATE task status / progress
router.put('/:id', authMiddleware, (req, res) => {
  const taskId = req.params.id;
  const user = req.user;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const isAssignee = task.assigned_to === user.id;
  const isCreator = task.assigned_by === user.id;
  const isFounder = user.role === 'founder';
  const isLead = user.role === 'team_lead';

  if (!isAssignee && !isCreator && !isFounder && !isLead) {
    return res.status(403).json({ error: 'Not authorized to modify this task' });
  }

  const { status, progress_pct, title, description, priority, due_date, deliverable_url, deliverable_notes } = req.body;
  let newStatus = status || task.status;
  let newProgress = progress_pct !== undefined ? Number(progress_pct) : task.progress_pct;

  if (status === 'completed' && task.status !== 'completed') {
    newProgress = 100;
  } else if (newProgress === 100 && newStatus !== 'completed') {
    newStatus = 'completed';
  } else if (newProgress > 0 && newStatus === 'todo') {
    newStatus = 'in_progress';
  }

  const newTitle = (isFounder || isLead || isCreator) && title ? title : task.title;
  const newDesc = (isFounder || isLead || isCreator) && description !== undefined ? description : task.description;
  const newPriority = (isFounder || isLead || isCreator) && priority ? priority : task.priority;
  const newDueDate = (isFounder || isLead || isCreator) && due_date !== undefined ? due_date : task.due_date;
  const newDeliverableUrl = deliverable_url !== undefined ? (deliverable_url ? deliverable_url.trim() : null) : task.deliverable_url;
  const newDeliverableNotes = deliverable_notes !== undefined ? deliverable_notes : task.deliverable_notes;

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, progress_pct = ?, deliverable_url = ?, deliverable_notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newTitle, newDesc, newStatus, newPriority, newDueDate, newProgress, newDeliverableUrl, newDeliverableNotes, taskId);

  if (task.status !== newStatus) {
    recordActivity(taskId, user.id, 'status_changed', `Status updated from ${task.status} to ${newStatus}`);
    
    if (newStatus === 'completed' && task.assigned_by !== user.id) {
      addNotification(
        task.assigned_by,
        'Task Completed!',
        `${user.name} marked "${task.title}" as completed.`,
        'task_completed',
        taskId
      );
    }
  }

  if (task.progress_pct !== newProgress) {
    recordActivity(taskId, user.id, 'progress_updated', `Progress updated to ${newProgress}%`);
  }

  if (deliverable_url && deliverable_url !== task.deliverable_url) {
    recordActivity(taskId, user.id, 'deliverable_attached', `${user.name} attached deliverable link: ${deliverable_url}`);
  }

  const updatedTask = db.prepare(`
    SELECT t.*,
           assignee.name as assignee_name, assignee.avatar as assignee_avatar, assignee.role as assignee_role,
           creator.name as creator_name
    FROM tasks t
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    LEFT JOIN users creator ON t.assigned_by = creator.id
    WHERE t.id = ?
  `).get(taskId);

  // Real-time broadcast
  if (req.io) {
    req.io.emit('task_updated', updatedTask);
  }

  res.json(updatedTask);
});

// POST comment to task (Discussions & Deliverables collaboration)
router.post('/:id/comments', authMiddleware, (req, res) => {
  const taskId = req.params.id;
  const user = req.user;
  const { content, deliverable_url } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Insert comment
  const stmt = db.prepare(`
    INSERT INTO task_comments (task_id, user_id, content, deliverable_url)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    taskId,
    user.id,
    content.trim(),
    deliverable_url && deliverable_url.trim() ? deliverable_url.trim() : null
  );

  // If deliverable_url was provided, also update task.deliverable_url
  if (deliverable_url && deliverable_url.trim()) {
    db.prepare('UPDATE tasks SET deliverable_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(deliverable_url.trim(), taskId);
  }

  // Record in activity history
  recordActivity(
    taskId,
    user.id,
    'comment',
    `${user.name} commented: "${content.trim().substring(0, 60)}${content.length > 60 ? '...' : ''}"`
  );

  // Notify assignee or creator
  if (task.assigned_to && task.assigned_to !== user.id) {
    addNotification(
      task.assigned_to,
      `New comment on Task #${task.id}`,
      `${user.name}: "${content.trim().substring(0, 80)}"`,
      'task_comment',
      taskId
    );
  }
  if (task.assigned_by && task.assigned_by !== user.id && task.assigned_by !== task.assigned_to) {
    addNotification(
      task.assigned_by,
      `New comment on Task #${task.id}`,
      `${user.name}: "${content.trim().substring(0, 80)}"`,
      'task_comment',
      taskId
    );
  }

  const newComment = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role, u.title as user_title
    FROM task_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  if (req.io) {
    req.io.emit('task_comment_added', { taskId: Number(taskId), comment: newComment });
    req.io.emit('task_updated', { id: Number(taskId) });
  }

  res.status(201).json(newComment);
});

// EMPLOYEE REQUESTS REJECTION / WRONG ASSIGNMENT
router.post('/:id/reject', authMiddleware, (req, res) => {
  const taskId = req.params.id;
  const user = req.user;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Please provide a reason for the reassignment request' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.assigned_to !== user.id && user.role !== 'founder') {
    return res.status(403).json({ error: 'Only the assigned employee can request reassignment' });
  }

  db.prepare(`
    UPDATE tasks
    SET rejection_status = 'requested',
        rejection_reason = ?,
        rejected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reason.trim(), taskId);

  recordActivity(
    taskId,
    user.id,
    'rejection_requested',
    `Rejection request submitted by ${user.name}. Reason: "${reason.trim()}"`
  );

  addNotification(
    task.assigned_by,
    'Reassignment Request',
    `${user.name} requested reassignment for "${task.title}": "${reason.trim()}"`,
    'task_rejected',
    taskId
  );

  const founders = db.prepare("SELECT id FROM users WHERE role = 'founder' AND id != ?").all(user.id);
  for (const f of founders) {
    if (f.id !== task.assigned_by) {
      addNotification(
        f.id,
        'Reassignment Request',
        `${user.name} requested reassignment for "${task.title}": "${reason.trim()}"`,
        'task_rejected',
        taskId
      );
    }
  }

  const updatedTask = db.prepare(`
    SELECT t.*,
           assignee.name as assignee_name, assignee.avatar as assignee_avatar,
           creator.name as creator_name
    FROM tasks t
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    LEFT JOIN users creator ON t.assigned_by = creator.id
    WHERE t.id = ?
  `).get(taskId);

  // Real-time broadcast
  if (req.io) {
    req.io.emit('rejection_requested', updatedTask);
  }

  res.json({ message: 'Rejection request submitted successfully', task: updatedTask });
});

// FOUNDER OR TEAM LEADER REASSIGNS TASK
router.post('/:id/reassign', authMiddleware, (req, res) => {
  const taskId = req.params.id;
  const user = req.user;
  const { new_assignee_id, notes, dismiss_rejection } = req.body;

  if (user.role !== 'founder' && user.role !== 'team_lead') {
    return res.status(403).json({ error: 'Only Founders and Team Leaders can reassign tasks' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (dismiss_rejection) {
    db.prepare(`
      UPDATE tasks
      SET rejection_status = 'rejected',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(taskId);

    recordActivity(
      taskId,
      user.id,
      'rejection_dismissed',
      `Rejection request dismissed by ${user.name}.${notes ? ` Note: ${notes}` : ''}`
    );

    if (task.assigned_to) {
      addNotification(
        task.assigned_to,
        'Reassignment Request Declined',
        `${user.name} reviewed your request and kept you assigned to "${task.title}".${notes ? ` Note: ${notes}` : ''}`,
        'task_reassigned',
        taskId
      );
    }

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (req.io) req.io.emit('task_reassigned', updatedTask);
    return res.json({ message: 'Reassignment request dismissed', task: updatedTask });
  }

  if (!new_assignee_id) {
    return res.status(400).json({ error: 'Please select a new employee to reassign this task to' });
  }

  const newAssignee = db.prepare('SELECT * FROM users WHERE id = ?').get(new_assignee_id);
  if (!newAssignee) {
    return res.status(404).json({ error: 'New assignee user not found' });
  }

  const oldAssigneeId = task.assigned_to;
  const oldAssignee = oldAssigneeId ? db.prepare('SELECT name FROM users WHERE id = ?').get(oldAssigneeId) : null;

  db.prepare(`
    UPDATE tasks
    SET assigned_to = ?,
        team_id = COALESCE(?, team_id),
        rejection_status = 'reassigned',
        status = 'todo',
        progress_pct = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newAssignee.id, newAssignee.team_id, taskId);

  recordActivity(
    taskId,
    user.id,
    'task_reassigned',
    `Reassigned from ${oldAssignee ? oldAssignee.name : 'Unassigned'} to ${newAssignee.name} by ${user.name}.${notes ? ` Note: ${notes}` : ''}`
  );

  addNotification(
    newAssignee.id,
    'Task Assigned (Reassigned)',
    `${user.name} assigned "${task.title}" to you.${notes ? ` Note: ${notes}` : ''}`,
    'task_assigned',
    taskId
  );

  if (oldAssigneeId) {
    addNotification(
      oldAssigneeId,
      'Task Reassigned',
      `Your request was accepted. "${task.title}" has been reassigned to ${newAssignee.name}.`,
      'task_reassigned',
      taskId
    );
  }

  const updatedTask = db.prepare(`
    SELECT t.*,
           assignee.name as assignee_name, assignee.avatar as assignee_avatar, assignee.role as assignee_role,
           creator.name as creator_name
    FROM tasks t
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    LEFT JOIN users creator ON t.assigned_by = creator.id
    WHERE t.id = ?
  `).get(taskId);

  // Real-time broadcast
  if (req.io) {
    req.io.emit('task_reassigned', updatedTask);
  }

  res.json({ message: `Successfully reassigned to ${newAssignee.name}`, task: updatedTask });
});

// DELETE task (Founders and Team Leads)
router.delete('/:id', authMiddleware, (req, res) => {
  const user = req.user;
  if (user.role !== 'founder' && user.role !== 'team_lead') {
    return res.status(403).json({ error: 'Only Founders and Team Leaders can delete tasks' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

  if (req.io) {
    req.io.emit('task_deleted', { taskId: req.params.id });
  }

  res.json({ message: 'Task deleted successfully' });
});

module.exports = router;
