import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Send, 
  Hash, 
  MessageSquare, 
  Users, 
  Search, 
  Circle, 
  ShieldCheck, 
  Crown, 
  Briefcase,
  Smile,
  ArrowLeft
} from 'lucide-react';
import { io } from 'socket.io-client';
import UserAvatar from './UserAvatar';

export default function MessagesView({ initialUserId }) {
  const { user, availableUsers } = useAuth();
  
  // Channels and Chat State
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'direct'
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mobileView, setMobileView] = useState(initialUserId ? 'chat' : 'list'); // 'list' or 'chat'
  
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Switch to direct chat if initialUserId provided
  useEffect(() => {
    if (initialUserId && availableUsers.length > 0) {
      const targetUser = availableUsers.find((u) => u.id === Number(initialUserId));
      if (targetUser) {
        setSelectedUser(targetUser);
        setSelectedTeam(null);
        setActiveTab('direct');
        setMobileView('chat');
      }
    }
  }, [initialUserId, availableUsers]);

  // Initialize Socket.io
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    if (user?.id) {
      socket.emit('join_user', user.id);
    }

    socket.on('new_message', (msg) => {
      // Check if message belongs to current open chat
      if (selectedTeam && msg.team_id === selectedTeam.id) {
        setMessages((prev) => [...prev, msg]);
      } else if (
        selectedUser &&
        !msg.team_id &&
        ((msg.sender_id === selectedUser.id && msg.recipient_id === user?.id) ||
         (msg.sender_id === user?.id && msg.recipient_id === selectedUser.id))
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, selectedTeam, selectedUser]);

  // Load initial teams and default selection
  useEffect(() => {
    async function loadData() {
      try {
        const teamList = await api.getTeams();
        setTeams(teamList);
        if (teamList.length > 0 && !selectedTeam && !selectedUser) {
          setSelectedTeam(teamList[0]);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  // Fetch messages when chat target changes
  const fetchMessages = async () => {
    try {
      setLoading(true);
      if (selectedTeam) {
        if (socketRef.current) socketRef.current.emit('join_team', selectedTeam.id);
        const data = await api.getTeamMessages(selectedTeam.id);
        setMessages(data);
      } else if (selectedUser) {
        const data = await api.getDirectMessages(selectedUser.id);
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTeam || selectedUser) {
      fetchMessages();
    }
  }, [selectedTeam, selectedUser]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    try {
      setSending(true);
      const payload = {
        content: inputMessage.trim(),
        team_id: selectedTeam ? selectedTeam.id : null,
        recipient_id: selectedUser ? selectedUser.id : null,
      };

      const newMsg = await api.sendMessage(payload);
      // Append if not received via socket
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setInputMessage('');
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'founder') return <Crown className="w-3.5 h-3.5 text-purple-600" title="Founder" />;
    if (role === 'team_lead') return <ShieldCheck className="w-3.5 h-3.5 text-blue-600" title="Team Lead" />;
    return <Briefcase className="w-3.5 h-3.5 text-emerald-600" title="Employee" />;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-13rem)] min-h-[520px] md:h-[750px] flex flex-col md:flex-row mb-6">
      
      {/* SIDEBAR: Channels & Direct Messages (Visible in 'list' mode on mobile, always visible on desktop) */}
      <div className={`w-full md:w-80 border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0 ${
        mobileView === 'chat' ? 'hidden md:flex' : 'flex flex-1'
      }`}>
        
        {/* Header Tabs */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            Communication Hub
          </h2>

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('teams');
                if (teams.length > 0 && !selectedTeam) {
                  setSelectedTeam(teams[0]);
                  setSelectedUser(null);
                }
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'teams' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Team Channels
            </button>
            <button
              onClick={() => {
                setActiveTab('direct');
                const firstUser = availableUsers.find((u) => u.id !== user?.id);
                if (firstUser && !selectedUser) {
                  setSelectedUser(firstUser);
                  setSelectedTeam(null);
                }
              }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'direct' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Circle className="w-3 h-3 text-emerald-500 fill-emerald-500" />
              Direct (1-on-1)
            </button>
          </div>
        </div>

        {/* Channels / Users List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {activeTab === 'teams' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                Company & Department Channels
              </p>
              {teams.map((t) => {
                const isSelected = selectedTeam?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTeam(t);
                      setSelectedUser(null);
                      setMobileView('chat');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                        : 'text-slate-700 hover:bg-slate-200/60 font-medium'
                    }`}
                  >
                    <Hash className={`w-4 h-4 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                    <div className="flex-1 truncate">
                      <p className="truncate">{t.name}</p>
                      <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {t.member_count} members • {t.task_count} tasks
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'direct' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                Teammates & Founders
              </p>
              {availableUsers
                .filter((u) => u.id !== user?.id)
                .map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setSelectedTeam(null);
                        setMobileView('chat');
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                          : 'text-slate-700 hover:bg-slate-200/60 font-medium'
                      }`}
                    >
                      <UserAvatar
                        name={u.name}
                        avatar={u.avatar}
                        role={u.role}
                        size="sm"
                        statusIndicator={true}
                      />
                      <div className="flex-1 truncate">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-semibold">{u.name}</p>
                          <span className="text-[10px] opacity-80">{u.role === 'founder' ? '👑' : u.role === 'team_lead' ? '🛡️' : '💼'}</span>
                        </div>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {u.title || u.role}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT PANE: Chat Conversation Feed (Visible in 'chat' mode on mobile, always visible on desktop) */}
      <div className={`flex-1 flex flex-col bg-white ${
        mobileView === 'list' ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Chat Top Bar with Back Button on Mobile */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              title="Back to Channels"
              aria-label="Back to channels list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {selectedTeam ? (
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <Hash className="w-5 h-5" />
              </div>
            ) : (
              <UserAvatar
                name={selectedUser?.name}
                avatar={selectedUser?.avatar}
                role={selectedUser?.role}
                size="md"
              />
            )}
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {selectedTeam ? selectedTeam.name : selectedUser?.name}
                </h3>
                {selectedUser && getRoleIcon(selectedUser.role)}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {selectedTeam
                  ? selectedTeam.description || 'Department discussion channel'
                  : `${selectedUser?.title || selectedUser?.role} • Direct Message`}
              </p>
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
          {messages.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              No messages here yet. Send a greeting to start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-[85%] ${
                    isMe ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <UserAvatar
                    name={msg.sender_name}
                    avatar={msg.sender_avatar}
                    role={msg.sender_role}
                    size="xs"
                    className="mt-0.5"
                  />
                  <div>
                    <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'justify-end' : ''}`}>
                      <span className="text-[11px] font-bold text-slate-800">
                        {isMe ? 'You' : msg.sender_name}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-xs shadow-md shadow-indigo-600/10'
                          : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/80 shadow-2xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex items-center gap-2">
          <input
            type="text"
            placeholder={
              selectedTeam
                ? `Message #${selectedTeam.name}...`
                : `Message ${selectedUser?.name}...`
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || sending}
            className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
}
