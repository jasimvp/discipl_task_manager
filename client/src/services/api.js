const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('tm_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  async getSetupStatus() {
    const res = await fetch(`${API_BASE}/auth/setup-status`);
    if (!res.ok) throw new Error('Failed to fetch setup status');
    return res.json();
  },

  // Auth & Registration
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Login failed');
      err.pending = data.pending;
      err.rejected = data.rejected;
      throw err;
    }
    return data;
  },

  async register(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async getTeams() {
    const res = await fetch(`${API_BASE}/auth/teams`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  },

  // Founder Access Management
  async getAccessRequests() {
    const res = await fetch(`${API_BASE}/auth/access-requests`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch access requests');
    return res.json();
  },

  async approveAccessRequest(userId, data = {}) {
    const res = await fetch(`${API_BASE}/auth/access-requests/${userId}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve request');
    }
    return res.json();
  },

  async rejectAccessRequest(userId) {
    const res = await fetch(`${API_BASE}/auth/access-requests/${userId}/reject`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reject request');
    }
    return res.json();
  },

  async inviteUser(userData) {
    const res = await fetch(`${API_BASE}/auth/invite-user`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to invite user');
    }
    return res.json();
  },

  async addEmployee(userData) {
    return this.inviteUser(userData);
  },

  async deleteUser(userId) {
    const res = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete user');
    }
    return res.json();
  },

  // Tasks
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/tasks${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async getTask(id) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch task');
    return res.json();
  },

  async createTask(taskData) {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(taskData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create task');
    }
    return res.json();
  },

  async updateTask(id, data) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update task');
    }
    return res.json();
  },

  async addTaskComment(taskId, { content, deliverable_url }) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content, deliverable_url }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to post comment');
    }
    return res.json();
  },

  async requestRejection(id, reason) {
    const res = await fetch(`${API_BASE}/tasks/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit rejection request');
    }
    return res.json();
  },

  async reassignTask(id, { new_assignee_id, notes, dismiss_rejection }) {
    const res = await fetch(`${API_BASE}/tasks/${id}/reassign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ new_assignee_id, notes, dismiss_rejection }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reassign task');
    }
    return res.json();
  },

  async deleteTask(id) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete task');
    }
    return res.json();
  },

  // Dashboard Stats
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  async getNotifications() {
    const res = await fetch(`${API_BASE}/dashboard/notifications`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationsRead() {
    const res = await fetch(`${API_BASE}/dashboard/notifications/mark-read`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to mark notifications read');
    return res.json();
  },

  // Messages
  async getTeamMessages(teamId) {
    const res = await fetch(`${API_BASE}/messages/team/${teamId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch team messages');
    return res.json();
  },

  async getDirectMessages(otherUserId) {
    const res = await fetch(`${API_BASE}/messages/direct/${otherUserId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch direct messages');
    return res.json();
  },

  async sendMessage({ recipient_id, team_id, content }) {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipient_id, team_id, content }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send message');
    }
    return res.json();
  },
};
