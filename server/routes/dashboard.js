const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../auth');

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    const isFounder = user.role === 'founder';
    const isLead = user.role === 'team_lead';

    let taskFilter = '1=1';
    const taskParams = [];
    if (!isFounder && user.team_id) {
      taskFilter = 'team_id = ?';
      taskParams.push(user.team_id);
    }

    // Overview stats (scoped to team for team leads)
    const totalTasksRow = await db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${taskFilter}`).get(...taskParams);
    const totalTasks = Number(totalTasksRow?.count || 0);

    const completedTasksRow = await db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${taskFilter} AND status = 'completed'`).get(...taskParams);
    const completedTasks = Number(completedTasksRow?.count || 0);

    const inProgressTasksRow = await db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${taskFilter} AND status = 'in_progress'`).get(...taskParams);
    const inProgressTasks = Number(inProgressTasksRow?.count || 0);

    const todoTasksRow = await db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${taskFilter} AND status = 'todo'`).get(...taskParams);
    const todoTasks = Number(todoTasksRow?.count || 0);

    const pendingRejectionsRow = await db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE ${taskFilter} AND rejection_status = 'requested'`).get(...taskParams);
    const pendingRejections = Number(pendingRejectionsRow?.count || 0);

    // Average progress percentage of incomplete tasks
    const avgProgressRow = await db.prepare(`SELECT AVG(progress_pct) as avg_progress FROM tasks WHERE ${taskFilter} AND status != 'completed'`).get(...taskParams);
    const avgProgress = avgProgressRow && avgProgressRow.avg_progress !== null ? Math.round(Number(avgProgressRow.avg_progress)) : 0;

    // Overall completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Employee-wise status and workload (scoped to user's team + leadership for regular employees)
    let empWhere = "WHERE u.status = 'approved'";
    const empParams = [];
    if (user.role === 'employee') {
      empWhere += " AND (u.role IN ('founder', 'team_lead') OR u.team_id = ?)";
      empParams.push(user.team_id || 0);
    }

    const employeeStats = await db.prepare(`
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
      ${empWhere}
      GROUP BY u.id, t.name
      ORDER BY total_tasks DESC, u.name ASC
    `).all(...empParams);

    // Team summary (scoped to user's team for regular employees)
    let teamWhere = '';
    const teamParams = [];
    if (user.role === 'employee') {
      teamWhere = 'WHERE tm.id = ?';
      teamParams.push(user.team_id || 0);
    }

    const teamStats = await db.prepare(`
      SELECT tm.id, tm.name,
             COUNT(tk.id) as total_tasks,
             SUM(CASE WHEN tk.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
             SUM(CASE WHEN tk.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
             SUM(CASE WHEN tk.status = 'todo' THEN 1 ELSE 0 END) as todo_tasks
      FROM teams tm
      LEFT JOIN tasks tk ON tk.team_id = tm.id
      ${teamWhere}
      GROUP BY tm.id
    `).all(...teamParams);

    // Priority breakdown
    const priorityStats = await db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      WHERE ${taskFilter}
      GROUP BY priority
    `).all(...taskParams);

    // Recent pending rejection tasks
    let rejWhere = "WHERE t.rejection_status = 'requested'";
    const rejParams = [];
    if (!isFounder && user.team_id) {
      rejWhere += ' AND t.team_id = ?';
      rejParams.push(user.team_id);
    }

    const pendingRejectionTasks = await db.prepare(`
      SELECT t.id, t.title, t.priority, t.rejection_reason, t.rejected_at,
             u.name as assigned_to_name, u.avatar as assigned_to_avatar,
             c.name as assigned_by_name
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      JOIN users c ON t.assigned_by = c.id
      ${rejWhere}
      ORDER BY t.rejected_at DESC
    `).all(...rejParams);

    // If user is employee, also return personal summary
    let mySummary = null;
    if (user.role === 'employee') {
      const myTotalRow = await db.prepare('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?').get(user.id);
      const myTotal = Number(myTotalRow?.count || 0);

      const myCompletedRow = await db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'completed'").get(user.id);
      const myCompleted = Number(myCompletedRow?.count || 0);

      const myInProgressRow = await db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'in_progress'").get(user.id);
      const myInProgress = Number(myInProgressRow?.count || 0);

      const myTodoRow = await db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'todo'").get(user.id);
      const myTodo = Number(myTodoRow?.count || 0);

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
        total_tasks: Number(e.total_tasks || 0),
        completed_tasks: Number(e.completed_tasks || 0),
        in_progress_tasks: Number(e.in_progress_tasks || 0),
        todo_tasks: Number(e.todo_tasks || 0),
        avg_progress: Math.round(Number(e.avg_progress || 0)),
        completion_pct: Number(e.total_tasks) > 0 ? Math.round((Number(e.completed_tasks) / Number(e.total_tasks)) * 100) : 0
      })),
      teamStats: teamStats.map(t => ({
        ...t,
        total_tasks: Number(t.total_tasks || 0),
        completed_tasks: Number(t.completed_tasks || 0),
        in_progress_tasks: Number(t.in_progress_tasks || 0),
        todo_tasks: Number(t.todo_tasks || 0),
      })),
      priorityStats,
      pendingRejectionTasks,
      mySummary
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Notifications endpoint
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const notifs = await db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 30
    `).all(req.user.id);

    const unreadCountRow = await db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(req.user.id);
    const unreadCount = Number(unreadCountRow?.count || 0);

    res.json({ notifications: notifs, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/notifications/mark-read', authMiddleware, async (req, res) => {
  try {
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

module.exports = router;
