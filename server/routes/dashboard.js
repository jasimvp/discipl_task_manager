const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../auth');

router.get('/stats', authMiddleware, (req, res) => {
  const user = req.user;

  // Overview stats
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get().count;
  const inProgressTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'").get().count;
  const todoTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'todo'").get().count;
  const pendingRejections = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE rejection_status = 'requested'").get().count;

  // Average progress percentage of incomplete tasks
  const avgProgressRow = db.prepare("SELECT AVG(progress_pct) as avg_progress FROM tasks WHERE status != 'completed'").get();
  const avgProgress = avgProgressRow && avgProgressRow.avg_progress !== null ? Math.round(avgProgressRow.avg_progress) : 0;

  // Overall completion rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Status breakdown for founders/team leads
  // Employee-wise status and workload
  const employeeStats = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.role, u.title, u.department,
           t.name as team_name,
           COUNT(tk.id) as total_tasks,
           SUM(CASE WHEN tk.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
           SUM(CASE WHEN tk.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
           SUM(CASE WHEN tk.status = 'todo' THEN 1 ELSE 0 END) as todo_tasks,
           SUM(CASE WHEN tk.rejection_status = 'requested' THEN 1 ELSE 0 END) as rejection_requests,
           AVG(CASE WHEN tk.id IS NOT NULL THEN tk.progress_pct ELSE 0 END) as avg_progress
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    LEFT JOIN tasks tk ON tk.assigned_to = u.id
    GROUP BY u.id
    ORDER BY total_tasks DESC, u.name ASC
  `).all();

  // Team summary
  const teamStats = db.prepare(`
    SELECT tm.id, tm.name,
           COUNT(tk.id) as total_tasks,
           SUM(CASE WHEN tk.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
           SUM(CASE WHEN tk.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
           SUM(CASE WHEN tk.status = 'todo' THEN 1 ELSE 0 END) as todo_tasks
    FROM teams tm
    LEFT JOIN tasks tk ON tk.team_id = tm.id
    GROUP BY tm.id
  `).all();

  // Priority breakdown
  const priorityStats = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM tasks
    GROUP BY priority
  `).all();

  // Recent pending rejection tasks for quick Founder/TL review
  const pendingRejectionTasks = db.prepare(`
    SELECT t.id, t.title, t.priority, t.rejection_reason, t.rejected_at,
           u.name as assigned_to_name, u.avatar as assigned_to_avatar,
           c.name as assigned_by_name
    FROM tasks t
    JOIN users u ON t.assigned_to = u.id
    JOIN users c ON t.assigned_by = c.id
    WHERE t.rejection_status = 'requested'
    ORDER BY t.rejected_at DESC
  `).all();

  // If user is employee, also return personal summary
  let mySummary = null;
  if (user.role === 'employee') {
    const myTotal = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?').get(user.id).count;
    const myCompleted = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'completed'").get(user.id).count;
    const myInProgress = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'in_progress'").get(user.id).count;
    const myTodo = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'todo'").get(user.id).count;
    mySummary = {
      total: myTotal,
      completed: myCompleted,
      in_progress: myInProgress,
      todo: myTodo,
      remaining: myTotal - myCompleted,
      completionRate: myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0
    };
  }

  res.json({
    summary: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      remainingTasks: totalTasks - completedTasks,
      pendingRejections,
      avgProgress,
      completionRate,
    },
    employeeStats: employeeStats.map(e => ({
      ...e,
      avg_progress: Math.round(e.avg_progress || 0),
      completion_pct: e.total_tasks > 0 ? Math.round((e.completed_tasks / e.total_tasks) * 100) : 0
    })),
    teamStats,
    priorityStats,
    pendingRejectionTasks,
    mySummary
  });
});

// Notifications endpoint
router.get('/notifications', authMiddleware, (req, res) => {
  const notifs = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(req.user.id);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ? AND is_read = 0
  `).get(req.user.id).count;

  res.json({ notifications: notifs, unreadCount });
});

router.post('/notifications/mark-read', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
