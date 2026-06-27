import { useState, useEffect, useRef } from 'react';
import { Send, Search, MessageSquare } from 'lucide-react';
import { api } from '../utils/api';
import { Avatar, Spinner, timeAgo, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export const MessagesPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    api.get('/users').then(setUsers).catch(() => {});
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 5s when a conversation is open
  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(() => loadMessages(selected, false), 5000);
    return () => clearInterval(interval);
  }, [selected]);

  const loadConversations = async () => {
    try {
      const data = await api.get('/messages/conversations');
      setConversations(data);
    } catch {}
  };

  const loadMessages = async (userId, showLoader = true) => {
    if (showLoader) setLoadingMsgs(true);
    try {
      const data = await api.get(`/messages/${userId}`);
      setMessages(data);
    } catch {}
    finally { setLoadingMsgs(false); }
  };

  const openConversation = async (userId) => {
    setSelected(userId);
    await loadMessages(userId);
    await loadConversations();
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      const msg = await api.post('/messages', { receiver_id: selected, content: text.trim() });
      setMessages(prev => [...prev, msg]);
      setText('');
      await loadConversations();
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  // Build list: conversations + anyone not yet messaged
  const allUsers = users.filter(u => u.id !== user?.id);
  const conversationIds = new Set(conversations.map(c => c.other_user));
  const newUsers = allUsers.filter(u => !conversationIds.has(u.id));

  const selectedUser = allUsers.find(u => u.id === selected);

  const filteredConvos = conversations.filter(c =>
    !search || c.other_name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredNew = newUsers.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--header-h) - 3.5rem)', gap: '1rem' }}>

      {/* Sidebar */}
      <div className="card" style={{ width: 280, flexShrink: 0, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1.5px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>Messages</div>
          <div className="search-bar" style={{ width: '100%' }}>
            <Search size={13}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…" style={{ width: '100%' }}/>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConvos.length > 0 && (
            <div style={{ padding: '0.5rem 0.75rem 0.25rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Recent</div>
          )}
          {filteredConvos.map(c => (
            <div key={c.other_user}
              onClick={() => openConversation(c.other_user)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.75rem 1rem', cursor: 'pointer',
                background: selected === c.other_user ? 'rgba(13,79,85,0.08)' : 'transparent',
                borderLeft: selected === c.other_user ? '3px solid var(--teal)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              <div style={{ position: 'relative' }}>
                <Avatar initials={c.other_initials || c.other_name?.[0] || '?'} size="md" />
                {Number(c.unread) > 0 && (
                  <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, background: 'var(--pink)', borderRadius: '50%', fontSize: '0.6rem', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, border: '2px solid var(--surface)' }}>
                    {c.unread}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text)' }}>{c.other_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_message}</div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text4)', flexShrink: 0 }}>{timeAgo(c.last_at)}</div>
            </div>
          ))}

          {filteredNew.length > 0 && (
            <div style={{ padding: '0.5rem 0.75rem 0.25rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', marginTop: '0.5rem' }}>All Team</div>
          )}
          {filteredNew.map(u => (
            <div key={u.id}
              onClick={() => openConversation(u.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.75rem 1rem', cursor: 'pointer',
                background: selected === u.id ? 'rgba(13,79,85,0.08)' : 'transparent',
                borderLeft: selected === u.id ? '3px solid var(--teal)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              <Avatar initials={u.avatar_initials || u.name?.[0] || '?'} size="md" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text)' }}>{u.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'capitalize' }}>{u.role}</div>
              </div>
            </div>
          ))}

          {filteredConvos.length === 0 && filteredNew.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.82rem' }}>No team members found</div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', gap: '0.75rem' }}>
            <div style={{ width: 64, height: 64, background: 'var(--surface2)', borderRadius: 18, display: 'grid', placeItems: 'center', color: 'var(--text4)' }}>
              <MessageSquare size={28} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text2)' }}>Select a conversation</div>
            <div style={{ fontSize: '0.82rem' }}>Choose a team member to start messaging</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface)' }}>
              <Avatar initials={selectedUser?.avatar_initials || selectedUser?.name?.[0] || '?'} size="md" />
              <div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '0.95rem' }}>{selectedUser?.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)', textTransform: 'capitalize' }}>{selectedUser?.role}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {loadingMsgs ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem' }}><Spinner /></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '0.82rem', marginTop: '2rem' }}>No messages yet. Say hello! 👋</div>
              ) : messages.map(m => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
                    {!isMe && <Avatar initials={m.sender_initials || m.sender_name?.[0] || '?'} size="sm" />}
                    <div style={{
                      maxWidth: '68%',
                      padding: '0.6rem 0.9rem',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? 'var(--teal)' : 'var(--surface2)',
                      color: isMe ? '#fff' : 'var(--text)',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      boxShadow: 'var(--shadow-xs)',
                    }}>
                      <div>{m.content}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.65, marginTop: '0.25rem', textAlign: 'right' }}>{timeAgo(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '0.85rem 1.25rem', borderTop: '1.5px solid var(--border)', display: 'flex', gap: '0.65rem', alignItems: 'flex-end', background: 'var(--surface)' }}>
              <textarea
                className="form-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message… (Enter to send)"
                rows={1}
                style={{ flex: 1, minHeight: 42, maxHeight: 120, resize: 'none', borderRadius: 12, padding: '0.6rem 0.9rem' }}
              />
              <button
                className="btn btn-primary"
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                style={{ height: 42, width: 42, padding: 0, display: 'grid', placeItems: 'center', borderRadius: 12, flexShrink: 0 }}
              >
                {sending ? <Spinner /> : <Send size={15}/>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
