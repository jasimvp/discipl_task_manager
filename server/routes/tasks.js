const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../auth');

// Helper to get all assignees for a task
async function getTaskAssignees(taskId) {
  try {
    return await db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.title, u.avatar
      FROM task_assignees ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ?
    `).all(taskId);
  } catch (e) {
    return [];
  }
}

// Helper to get sequential workflow stages for a task
async function getTaskStages(taskId) {
  try {
    return await db.prepare(`
      SELECT s.*,
             u.name as assignee_name, u.avatar as assignee_avatar, u.role as assignee_role, u.title as assignee_title, u.email as assignee_email
      FROM task_chain_stages s
      JOIN users u ON s.assigned_to = u.id
      WHERE s.task_id = ?
      ORDER BY s.stage_order ASC
    `).all(taskId);
  } catch (e) {
    return [];
  }
}

// Helper to enrich task with assignees, chain stages, and claim lock details
async function enrichTask(task) {
  if (!task) return null;
  const assignees = await getTaskAssignees(task.id);
  const stages = task.is_chain ? await getTaskStages(task.id) : [];

  // If chain, ensure all stage assignees are included in the assignees array
  if (stages.length > 0) {
    for (const stage of stages) {
      if (!assignees.some((a) => a.id === stage.assigned_to)) {
        assignees.push({
          id: stage.assigned_to,
          name: stage.assignee_name,
          avatar: stage.assignee_avatar,
          role: stage.assignee_role,
          title: stage.assignee_title,
          email: stage.assignee_email,
        });
      }
    }
  }

  // Ensure primary assignee is in the list
  if (task.assigned_to && !assignees.some((a) => a.id === task.assigned_to)) {
    const primary = await db.prepare('SELECT id, name, email, role, title, avatar FROM users WHERE id = ?').get(task.assigned_to);
    if (primary) assignees.unshift(primary);
  }

  let claimed_by_name = null;
  let claimed_by_avatar = null;
  if (task.claimed_by) {
    const claimer = await db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(task.claimed_by);
    if (claimer) {
      claimed_by_name = claimer.name;
      claimed_by_avatar = claimer.avatar;
    }
  }

  const active_stage = stages.find((s) => s.status === 'active') || null;

  return {
    ...task,
    stages,
    active_stage,
    assignees,
    claimed_by_name,
    claimed_by_avatar,
  };
}

// Helper to get full task with all details
async function getFullTask(taskId) {
  const task = await db.prepare(`
    SELECT t.*,
           assignee.name as assignee_name, assignee.avatar as assignee_avatar, assignee.role as assignee_role, assignee.title as assignee_title, assignee.email as assignee_email,
           creator.name as creator_name, creator.avatar as creator_avatar,
           tm.name as team_name
    FROM tasks t
    LEFT JOIN users assignee ON t.assigned_to = assignee.id
    LEFT JOIN users creator ON t.assigned_by = creator.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    WHERE t.id = ?
  `).get(taskId);

  return await enrichTask(task);
}

// Helper to record activity
async function recordActivity(taskId, userId, activityType, details) {
  try {
    await db.prepare(`
      INSERT INTO task_activities (task_id, user_id, activity_type, details)
      VALUES (?, ?, ?, ?)
    `).run(taskId, userId, activityType, details);
  } catch (e) {
    console.error('Failed to record activity:', e);
  }
}

// Helper to add notification
async function addNotification(userId, title, message, type, taskId) {
  try {
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, task_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, title, message, type, taskId);
  } catch (e) {
    console.error('Failed to add notification:', e);
  }
}

// GET all tasks (with filters & search)
router.get('/', authMiddleware, async (req, res) => {
  try {
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

    // Multi-assignee role-based visibility:
    if (user.role === 'employee') {
      if (assigned_to) {
        query += ` AND (t.assigned_to = ? OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?))`;
        params.push(assigned_to, assigned_to);
      } else {
        query += ` AND (t.assigned_to = ? OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?) OR t.team_id = ?)`;
        params.push(user.id, user.id, user.team_id || 0);
      }
    } else if (user.role === 'team_lead') {
      if (assigned_to) {
        query += ` AND (t.assigned_to = ? OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?))`;
        params.push(assigned_to, assigned_to);
      }
    } else if (user.role === 'founder') {
      if (assigned_to) {
        query += ` AND (t.assigned_to = ? OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ?))`;
        params.push(assigned_to, assigned_to);
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

    const tasks = await db.prepare(query).all(...params);
    const enrichedTasks = await Promise.all(tasks.map(enrichTask));
    res.json(enrichedTasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET single task by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await getFullTask(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get activities
    const activities = await db.prepare(`
      SELECT a.*, u.name as user_name, u.avatar as user_avatar
      FROM task_activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at DESC
    `).all(req.params.id);

    // Get discussion comments
    const comments = await db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role, u.title as user_title
      FROM task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);

    res.json({ ...task, activities, comments });
  } catch (err) {
    console.error('Error fetching task details:', err);
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
});

// CREATE task (Founders and Team Leads)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'founder' && user.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only Founders and Team Leaders can assign tasks' });
    }

    const { title, description, priority, assigned_to, assigned_to_ids, team_id, due_date, is_chain, stages } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const isChainTask = Boolean(is_chain && Array.isArray(stages) && stages.length > 0);

    // Build assignee list
    let assigneesList = [];
    if (isChainTask) {
      const stageAssignees = stages.map(s => Number(s.assigned_to)).filter(Boolean);
      assigneesList = [...new Set(stageAssignees)];
    } else if (Array.isArray(assigned_to_ids) && assigned_to_ids.length > 0) {
      assigneesList = assigned_to_ids.map(Number).filter(Boolean);
    } else if (assigned_to) {
      assigneesList = [Number(assigned_to)];
    }

    const primaryAssignee = isChainTask && stages[0]?.assigned_to
      ? Number(stages[0].assigned_to)
      : (assigneesList[0] || null);

    let finalTeamId = team_id;
    if (!finalTeamId && primaryAssignee) {
      const assignee = await db.prepare('SELECT team_id FROM users WHERE id = ?').get(primaryAssignee);
      if (assignee) finalTeamId = assignee.team_id;
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, status, priority, assigned_to, assigned_by, team_id, due_date, progress_pct, rejection_status, is_chain, active_stage_index)
      VALUES (?, ?, 'todo', ?, ?, ?, ?, ?, 0, 'none', ?, 0)
    `);

    const result = await stmt.run(
      title.trim(),
      description || '',
      priority || 'medium',
      primaryAssignee,
      user.id,
      finalTeamId || null,
      due_date || null,
      isChainTask ? 1 : 0
    );

    const taskId = result.lastInsertRowid;

    // Insert all assignees into task_assignees
    const insertAssigneeStmt = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)');
    for (const uid of assigneesList) {
      await insertAssigneeStmt.run(taskId, uid);
    }

    // If chain workflow, insert stages and notify
    if (isChainTask) {
      const insertStageStmt = db.prepare(`
        INSERT INTO task_chain_stages (task_id, stage_order, title, description, assigned_to, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (let idx = 0; idx < stages.length; idx++) {
        const stage = stages[idx];
        const order = idx + 1;
        const status = idx === 0 ? 'active' : 'pending';
        await insertStageStmt.run(
          taskId,
          order,
          stage.title || `Stage ${order}`,
          stage.description || '',
          Number(stage.assigned_to),
          status
        );

        // Notification
        if (Number(stage.assigned_to) !== user.id) {
          if (idx === 0) {
            await addNotification(
              Number(stage.assigned_to),
              'Sequential Workflow: Stage 1 Active 🚀',
              `${user.name} assigned you to initiate Stage 1 ("${stage.title}") of "${title.trim()}". Work starts with you!`,
              'chain_stage_active',
              taskId
            );
          } else {
            await addNotification(
              Number(stage.assigned_to),
              `Queued in Sequential Workflow (Step ${order}) ⏳`,
              `${user.name} queued you for Step ${order} ("${stage.title}") of "${title.trim()}". You will be notified automatically once earlier stages are done.`,
              'chain_stage_queued',
              taskId
            );
          }
        }
      }

      await recordActivity(taskId, user.id, 'chain_workflow_created', `Sequential chain workflow created with ${stages.length} stages by ${user.name}`);
    } else {
      // Normal notifications for regular task
      for (const uid of assigneesList) {
        if (uid !== user.id) {
          await addNotification(
            uid,
            'New Deliverable Assigned',
            `${user.name} assigned you a deliverable: "${title.trim()}"`,
            'task_assigned',
            taskId
          );
        }
      }
      await recordActivity(taskId, user.id, 'task_created', `Task created with ${assigneesList.length} assignee(s) by ${user.name}`);
    }

    const newTask = await getFullTask(taskId);

    // Real-time broadcast
    if (req.io) {
      req.io.emit('task_created', newTask);
    }

    res.status(201).json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// CLAIM / START TASK - Concurrency Lock to prevent duplicate work!
router.post('/:id/claim', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const user = req.user;

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status === 'completed') {
      return res.status(400).json({ error: 'This task is already completed.' });
    }

    // Check if another teammate has already locked / claimed this task
    if (task.claimed_by && task.claimed_by !== user.id && task.status === 'in_progress') {
      const claimer = await db.prepare('SELECT name FROM users WHERE id = ?').get(task.claimed_by);
      return res.status(409).json({
        error: `Task is currently in progress by ${claimer?.name || 'another team member'}. To prevent duplicate work, please coordinate with them.`
      });
    }

    // Lock task under current user
    await db.prepare(`
      UPDATE tasks
      SET claimed_by = ?,
          claimed_at = CURRENT_TIMESTAMP,
          status = 'in_progress',
          progress_pct = CASE WHEN progress_pct = 0 THEN 20 ELSE progress_pct END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id, taskId);

    await recordActivity(taskId, user.id, 'task_claimed', `${user.name} started working on this deliverable (Locked for concurrent work)`);

    // Add system discussion comment
    try {
      await db.prepare(`
        INSERT INTO task_comments (task_id, user_id, content)
        VALUES (?, ?, ?)
      `).run(taskId, user.id, `🚀 Started working on this deliverable. Concurrent work lock active.`);
    } catch (e) {}

    // Notify other assignees so they know work has started
    const otherAssignees = await db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ? AND user_id != ?').all(taskId, user.id);
    for (const a of otherAssignees) {
      await addNotification(
        a.user_id,
        'Teammate Started Deliverable',
        `${user.name} started working on "${task.title}".`,
        'task_started',
        taskId
      );
    }

    const updatedTask = await getFullTask(taskId);

    if (req.io) {
      req.io.emit('task_updated', updatedTask);
      req.io.emit('task_claimed', { taskId: Number(taskId), claimed_by: user.id, claimed_by_name: user.name });
    }

    res.json({ message: 'Task started and claimed! Teammates have been notified.', task: updatedTask });
  } catch (err) {
    console.error('Error claiming task:', err);
    res.status(500).json({ error: 'Failed to claim task' });
  }
});

// RELEASE CLAIM - Worker pauses or releases claim for teammates
router.post('/:id/release-claim', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const user = req.user;

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.claimed_by !== user.id && user.role !== 'founder' && user.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only the active worker or a manager can release this task.' });
    }

    await db.prepare(`
      UPDATE tasks
      SET claimed_by = NULL,
          claimed_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(taskId);

    await recordActivity(taskId, user.id, 'claim_released', `${user.name} paused/released active lock on this deliverable.`);

    try {
      await db.prepare(`
        INSERT INTO task_comments (task_id, user_id, content)
        VALUES (?, ?, ?)
      `).run(taskId, user.id, `⏸️ Active work paused. Deliverable unlocked for other assignees.`);
    } catch (e) {}

    const updatedTask = await getFullTask(taskId);

    if (req.io) {
      req.io.emit('task_updated', updatedTask);
    }

    res.json({ message: 'Task claim released.', task: updatedTask });
  } catch (err) {
    console.error('Error releasing claim:', err);
    res.status(500).json({ error: 'Failed to release task claim' });
  }
});

// COMPLETE ACTIVE STAGE IN CHAIN WORKFLOW - Handoff to next stage!
router.post('/:id/complete-stage', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const user = req.user;
    const { deliverable_url, deliverable_notes } = req.body;

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.is_chain) {
      return res.status(400).json({ error: 'This task is not a sequential chain workflow.' });
    }

    // Find currently active stage
    const activeStage = await db.prepare(`
      SELECT * FROM task_chain_stages
      WHERE task_id = ? AND status = 'active'
      ORDER BY stage_order ASC
      LIMIT 1
    `).get(taskId);

    if (!activeStage) {
      return res.status(400).json({ error: 'No active stage found to complete.' });
    }

    // Authorization check: Must be assigned to this stage, or be founder / team_lead
    const isStageAssignee = activeStage.assigned_to === user.id;
    const isFounder = user.role === 'founder';
    const isLead = user.role === 'team_lead';

    if (!isStageAssignee && !isFounder && !isLead) {
      return res.status(403).json({ error: 'You are not authorized to complete this active stage.' });
    }

    // Mark current stage completed with deliverable notes and URL
    await db.prepare(`
      UPDATE task_chain_stages
      SET status = 'completed',
          deliverable_url = ?,
          deliverable_notes = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(deliverable_url ? deliverable_url.trim() : null, deliverable_notes || '', activeStage.id);

    // Check if there is a next stage
    const nextStage = await db.prepare(`
      SELECT * FROM task_chain_stages
      WHERE task_id = ? AND stage_order > ?
      ORDER BY stage_order ASC
      LIMIT 1
    `).get(taskId, activeStage.stage_order);

    // Count total stages and completed stages to calculate accurate progress %
    const totalStagesRow = await db.prepare('SELECT COUNT(*) as count FROM task_chain_stages WHERE task_id = ?').get(taskId);
    const totalStages = Number(totalStagesRow?.count || 1);
    const completedStagesRow = await db.prepare("SELECT COUNT(*) as count FROM task_chain_stages WHERE task_id = ? AND status = 'completed'").get(taskId);
    const completedStages = Number(completedStagesRow?.count || 0);
    const progressPct = Math.min(100, Math.round((completedStages / totalStages) * 100));

    if (nextStage) {
      // Unlock next stage!
      await db.prepare(`
        UPDATE task_chain_stages
        SET status = 'active'
        WHERE id = ?
      `).run(nextStage.id);

      // Update main task to point to next stage assignee and advance index
      await db.prepare(`
        UPDATE tasks
        SET assigned_to = ?,
            status = 'in_progress',
            progress_pct = ?,
            active_stage_index = active_stage_index + 1,
            claimed_by = NULL,
            claimed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextStage.assigned_to, progressPct, taskId);

      // Get next assignee user info
      const nextUser = await db.prepare('SELECT id, name FROM users WHERE id = ?').get(nextStage.assigned_to);

      await recordActivity(
        taskId,
        user.id,
        'chain_stage_completed',
        `Completed Step ${activeStage.stage_order} ("${activeStage.title}"). Unlocked Step ${nextStage.stage_order} ("${nextStage.title}") for ${nextUser?.name || 'next assignee'}.`
      );

      // Add discussion message documenting handoff
      try {
        await db.prepare(`
          INSERT INTO task_comments (task_id, user_id, content)
          VALUES (?, ?, ?)
        `).run(
          taskId,
          user.id,
          `🏁 Completed Step ${activeStage.stage_order}: "${activeStage.title}"\n${deliverable_notes ? `📝 Deliverable Notes: ${deliverable_notes}\n` : ''}${deliverable_url ? `🔗 Asset/Link: ${deliverable_url}\n` : ''}👉 Unlocked Step ${nextStage.stage_order}: "${nextStage.title}" for @${nextUser?.name || 'teammate'}`
        );
      } catch (e) {}

      // Send notification to next assignee
      if (nextStage.assigned_to !== user.id) {
        await addNotification(
          nextStage.assigned_to,
          'Your Turn! Stage Unlocked 🚀',
          `${user.name} completed "${activeStage.title}". Step ${nextStage.stage_order} ("${nextStage.title}") is now active and ready for you!`,
          'chain_stage_unlocked',
          taskId
        );
      }

      // Send notification to creator
      if (task.assigned_by && task.assigned_by !== user.id && task.assigned_by !== nextStage.assigned_to) {
        await addNotification(
          task.assigned_by,
          'Stage Completed in Pipeline 📊',
          `${user.name} completed Stage ${activeStage.stage_order} ("${activeStage.title}"). Handed off to ${nextUser?.name}.`,
          'chain_stage_progress',
          taskId
        );
      }

    } else {
      // All stages finished! Complete the entire task!
      await db.prepare(`
        UPDATE tasks
        SET status = 'completed',
            progress_pct = 100,
            completed_at = CURRENT_TIMESTAMP,
            claimed_by = NULL,
            claimed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(taskId);

      await recordActivity(
        taskId,
        user.id,
        'chain_completed',
        `Completed final Stage ${activeStage.stage_order} ("${activeStage.title}"). Entire sequential workflow completed! 🎉`
      );

      try {
        await db.prepare(`
          INSERT INTO task_comments (task_id, user_id, content)
          VALUES (?, ?, ?)
        `).run(
          taskId,
          user.id,
          `🎉 Final Step ${activeStage.stage_order}: "${activeStage.title}" completed! The full sequential chain workflow is now complete.`
        );
      } catch (e) {}

      // Notify all participants
      const allAssignees = await db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?').all(taskId);
      const recipientIds = new Set(allAssignees.map((a) => a.user_id));
      if (task.assigned_by) recipientIds.add(task.assigned_by);
      recipientIds.delete(user.id);

      for (const rid of recipientIds) {
        await addNotification(
          rid,
          'Sequential Workflow Completed! 🎉',
          `All stages of "${task.title}" have been completed! Finished by ${user.name}.`,
          'chain_all_completed',
          taskId
        );
      }
    }

    const updatedTask = await getFullTask(taskId);

    if (req.io) {
      req.io.emit('task_updated', updatedTask);
      req.io.emit('chain_stage_updated', { taskId: Number(taskId), activeStage, nextStage: nextStage || null });
    }

    res.json({
      message: nextStage ? 'Stage completed and next stage unlocked!' : 'All stages completed! Deliverable finished.',
      task: updatedTask
    });
  } catch (err) {
    console.error('Error completing stage:', err);
    res.status(500).json({ error: 'Failed to complete stage' });
  }
});

// UPDATE task status / progress - Synced completion across all assignees!
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const user = req.user;
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is an assignee
    const isAssignee = task.assigned_to === user.id || 
      Boolean(await db.prepare('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?').get(taskId, user.id));
    const isCreator = task.assigned_by === user.id;
    const isFounder = user.role === 'founder';
    const isLead = user.role === 'team_lead';

    if (!isAssignee && !isCreator && !isFounder && !isLead) {
      return res.status(403).json({ error: 'Not authorized to modify this task' });
    }

    // Race-condition prevention: If someone else locked it in progress, other assignees cannot modify progress without claiming
    if (task.claimed_by && task.claimed_by !== user.id && task.status === 'in_progress' && !isFounder && !isLead) {
      const claimer = await db.prepare('SELECT name FROM users WHERE id = ?').get(task.claimed_by);
      return res.status(409).json({
        error: `Conflict: This task is actively locked by ${claimer?.name || 'another assignee'}. Only the active worker or a manager can update it.`
      });
    }

    const { status, progress_pct, title, description, priority, due_date, deliverable_url, deliverable_notes, assigned_to_ids } = req.body;
    let newStatus = status || task.status;
    let newProgress = progress_pct !== undefined ? Number(progress_pct) : task.progress_pct;

    if (status === 'completed' && task.status !== 'completed') {
      newProgress = 100;
    } else if (newProgress === 100 && newStatus !== 'completed') {
      newStatus = 'completed';
    } else if (newProgress > 0 && newStatus === 'todo') {
      newStatus = 'in_progress';
    }

    // If status is moved to in_progress and no claimer set yet, claim it for this user
    let newClaimedBy = task.claimed_by;
    let newClaimedAt = task.claimed_at;
    if (newStatus === 'in_progress' && !newClaimedBy) {
      newClaimedBy = user.id;
      newClaimedAt = new Date().toISOString();
    }

    const newTitle = (isFounder || isLead || isCreator) && title ? title : task.title;
    const newDesc = (isFounder || isLead || isCreator) && description !== undefined ? description : task.description;
    const newPriority = (isFounder || isLead || isCreator) && priority ? priority : task.priority;
    const newDueDate = (isFounder || isLead || isCreator) && due_date !== undefined ? due_date : task.due_date;
    const newDeliverableUrl = deliverable_url !== undefined ? (deliverable_url ? deliverable_url.trim() : null) : task.deliverable_url;
    const newDeliverableNotes = deliverable_notes !== undefined ? deliverable_notes : task.deliverable_notes;

    await db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, progress_pct = ?, deliverable_url = ?, deliverable_notes = ?, claimed_by = ?, claimed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newTitle, newDesc, newStatus, newPriority, newDueDate, newProgress, newDeliverableUrl, newDeliverableNotes, newClaimedBy, newClaimedAt, taskId);

    // If assigned_to_ids was updated by manager
    if (Array.isArray(assigned_to_ids) && (isFounder || isLead)) {
      await db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
      const ins = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)');
      for (const uid of assigned_to_ids) {
        await ins.run(taskId, Number(uid));
      }
      if (assigned_to_ids[0]) {
        await db.prepare('UPDATE tasks SET assigned_to = ? WHERE id = ?').run(Number(assigned_to_ids[0]), taskId);
      }
    }

    if (task.status !== newStatus) {
      await recordActivity(taskId, user.id, 'status_changed', `Status updated from ${task.status} to ${newStatus}`);
      
      // When completed, notify all assignees and creator!
      if (newStatus === 'completed') {
        const allAssignees = await db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?').all(taskId);
        const recipientIds = new Set(allAssignees.map(a => a.user_id));
        if (task.assigned_by) recipientIds.add(task.assigned_by);
        recipientIds.delete(user.id);

        for (const rid of recipientIds) {
          await addNotification(
            rid,
            'Deliverable Completed! ✅',
            `${user.name} completed "${task.title}". Synced across all assignees!`,
            'task_completed',
            taskId
          );
        }
      }
    }

    if (task.progress_pct !== newProgress) {
      await recordActivity(taskId, user.id, 'progress_updated', `Progress updated to ${newProgress}%`);
    }

    if (deliverable_url && deliverable_url !== task.deliverable_url) {
      await recordActivity(taskId, user.id, 'deliverable_attached', `${user.name} attached deliverable link: ${deliverable_url}`);
    }

    const updatedTask = await getFullTask(taskId);

    // Real-time broadcast
    if (req.io) {
      req.io.emit('task_updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST comment to task (Discussions & Deliverables collaboration)
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const user = req.user;
    const { content, deliverable_url } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Insert comment
    const stmt = db.prepare(`
      INSERT INTO task_comments (task_id, user_id, content, deliverable_url)
      VALUES (?, ?, ?, ?)
    `);
    const result = await stmt.run(
      taskId,
      user.id,
      content.trim(),
      deliverable_url && deliverable_url.trim() ? deliverable_url.trim() : null
    );

    // If deliverable_url was provided, also update task.deliverable_url
    if (deliverable_url && deliverable_url.trim()) {
      await db.prepare('UPDATE tasks SET deliverable_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(deliverable_url.trim(), taskId);
    }

    // Record in activity history
    await recordActivity(
      taskId,
      user.id,
      'comment',
      `${user.name} commented: "${content.trim().substring(0, 60)}${content.length > 60 ? '...' : ''}"`
    );

    // Notify assignee or creator
    if (task.assigned_to && task.assigned_to !== user.id) {
      await addNotification(
        task.assigned_to,
        `New comment on Task #${task.id}`,
        `${user.name}: "${content.trim().substring(0, 80)}"`,
        'task_comment',
        taskId
      );
    }
    if (task.assigned_by && task.assigned_by !== user.id && task.assigned_by !== task.assigned_to) {
      await addNotification(
        task.assigned_by,
        `New comment on Task #${task.id}`,
        `${user.name}: "${content.trim().substring(0, 80)}"`,
        'task_comment',
        taskId
      );
    }

    const newComment = await db.prepare(`
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
  } catch (err) {
    console.error('Error posting comment:', err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// EMPLOYEE REQUESTS REJECTION / WRONG ASSIGNMENT
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const user = req.user;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Please provide a reason for the reassignment request' });
    }

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.assigned_to !== user.id && user.role !== 'founder') {
      return res.status(403).json({ error: 'Only the assigned employee can request reassignment' });
    }

    await db.prepare(`
      UPDATE tasks
      SET rejection_status = 'requested',
          rejection_reason = ?,
          rejected_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason.trim(), taskId);

    await recordActivity(
      taskId,
      user.id,
      'rejection_requested',
      `Rejection request submitted by ${user.name}. Reason: "${reason.trim()}"`
    );

    await addNotification(
      task.assigned_by,
      'Reassignment Request',
      `${user.name} requested reassignment for "${task.title}": "${reason.trim()}"`,
      'task_rejected',
      taskId
    );

    const founders = await db.prepare("SELECT id FROM users WHERE role = 'founder' AND id != ?").all(user.id);
    for (const f of founders) {
      if (f.id !== task.assigned_by) {
        await addNotification(
          f.id,
          'Reassignment Request',
          `${user.name} requested reassignment for "${task.title}": "${reason.trim()}"`,
          'task_rejected',
          taskId
        );
      }
    }

    const updatedTask = await db.prepare(`
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
  } catch (err) {
    console.error('Error submitting rejection request:', err);
    res.status(500).json({ error: 'Failed to submit rejection request' });
  }
});

// FOUNDER OR TEAM LEADER REASSIGNS TASK
router.post('/:id/reassign', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const user = req.user;
    const { new_assignee_id, notes, dismiss_rejection } = req.body;

    if (user.role !== 'founder' && user.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only Founders and Team Leaders can reassign tasks' });
    }

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (dismiss_rejection) {
      await db.prepare(`
        UPDATE tasks
        SET rejection_status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(taskId);

      await recordActivity(
        taskId,
        user.id,
        'rejection_dismissed',
        `Rejection request dismissed by ${user.name}.${notes ? ` Note: ${notes}` : ''}`
      );

      if (task.assigned_to) {
        await addNotification(
          task.assigned_to,
          'Reassignment Request Declined',
          `${user.name} reviewed your request and kept you assigned to "${task.title}".${notes ? ` Note: ${notes}` : ''}`,
          'task_reassigned',
          taskId
        );
      }

      const updatedTask = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      if (req.io) req.io.emit('task_reassigned', updatedTask);
      return res.json({ message: 'Reassignment request dismissed', task: updatedTask });
    }

    if (!new_assignee_id) {
      return res.status(400).json({ error: 'Please select a new employee to reassign this task to' });
    }

    const newAssignee = await db.prepare('SELECT * FROM users WHERE id = ?').get(new_assignee_id);
    if (!newAssignee) {
      return res.status(404).json({ error: 'New assignee user not found' });
    }

    const oldAssigneeId = task.assigned_to;
    const oldAssignee = oldAssigneeId ? await db.prepare('SELECT name FROM users WHERE id = ?').get(oldAssigneeId) : null;

    await db.prepare(`
      UPDATE tasks
      SET assigned_to = ?,
          team_id = COALESCE(?, team_id),
          rejection_status = 'reassigned',
          status = 'todo',
          progress_pct = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newAssignee.id, newAssignee.team_id, taskId);

    await recordActivity(
      taskId,
      user.id,
      'task_reassigned',
      `Reassigned from ${oldAssignee ? oldAssignee.name : 'Unassigned'} to ${newAssignee.name} by ${user.name}.${notes ? ` Note: ${notes}` : ''}`
    );

    await addNotification(
      newAssignee.id,
      'Task Assigned (Reassigned)',
      `${user.name} assigned "${task.title}" to you.${notes ? ` Note: ${notes}` : ''}`,
      'task_assigned',
      taskId
    );

    if (oldAssigneeId) {
      await addNotification(
        oldAssigneeId,
        'Task Reassigned',
        `Your request was accepted. "${task.title}" has been reassigned to ${newAssignee.name}.`,
        'task_reassigned',
        taskId
      );
    }

    const updatedTask = await db.prepare(`
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
  } catch (err) {
    console.error('Error reassigning task:', err);
    res.status(500).json({ error: 'Failed to reassign task' });
  }
});

// DELETE task (Founders and Team Leads)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'founder' && user.role !== 'team_lead') {
      return res.status(403).json({ error: 'Only Founders and Team Leaders can delete tasks' });
    }

    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.prepare('DELETE FROM task_chain_stages WHERE task_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM task_activities WHERE task_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM task_comments WHERE task_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

    if (req.io) {
      req.io.emit('task_deleted', { taskId: req.params.id });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
