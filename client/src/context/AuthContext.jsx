import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tm_token'));
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    // In production, socket connects to current host; in dev to localhost:5000
    const socketUrl = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
    const s = io(socketUrl);
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Fetch current user if token exists
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await api.getMe();
        setUser(profile);
      } catch (err) {
        console.error('Failed to load user:', err);
        localStorage.removeItem('tm_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  // Load active company users list when logged in
  const refreshUsers = async () => {
    if (token) {
      try {
        const users = await api.getUsers();
        setAvailableUsers(users);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    refreshUsers();
  }, [token, user]);

  // Listen for real-time socket events
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('join_user', user.id);

    const handleUserAdded = () => refreshUsers();
    const handleAccessApproved = (data) => {
      refreshUsers();
      if (data && data.userId === user.id) {
        // If current user was approved, refresh their profile live!
        api.getMe().then(setUser).catch(console.error);
      }
    };
    const handleUserRemoved = (data) => {
      if (data && data.userId === user.id) {
        logout();
      } else {
        refreshUsers();
      }
    };

    socket.on('user_added', handleUserAdded);
    socket.on('access_approved', handleAccessApproved);
    socket.on('access_request_updated', handleAccessApproved);
    socket.on('user_removed', handleUserRemoved);

    return () => {
      socket.off('user_added', handleUserAdded);
      socket.off('access_approved', handleAccessApproved);
      socket.off('access_request_updated', handleAccessApproved);
      socket.off('user_removed', handleUserRemoved);
    };
  }, [socket, user]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('tm_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.token) {
      localStorage.setItem('tm_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('tm_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      availableUsers,
      socket,
      login,
      register,
      logout,
      refreshUsers,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
