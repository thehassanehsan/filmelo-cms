import { useState, useEffect, useRef } from 'react';
import { Send, Users } from 'lucide-react';
import { api } from '../utils/api';
import { Avatar, Spinner, timeAgo, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export const TeamChatPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef();

  const load = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await api.get('/teamchat');
      setMessages(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Poll every 4s
  useEffect(() => {
    const interval = setInterval(() => load(false), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await api.post('/teamchat', { content: text.trim() });
      setMessages(prev => [...prev, msg]);
      setText('');
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Group consecutive messages by same sender
  const grouped = messages.reduce((acc, m, i) => {
    const prev = messages[i - 1];
    const sameUser = prev && prev.sender_id === m.sender_id &&
      (new Date(m.created_at) - new Date(prev.created_at)) < 5 * 60 * 1000;
    acc.push({ ...m, showAvatar: !sameUser });
    return acc;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-h) - 3.5rem)' }}>

      {/* Header */}
      <div className="card" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, background: 'rgba(13,79,85,0.1)', borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--teal)' }}>
          <Users size={18} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>Team Channel</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Messages visible to the entire team</div>
        </div>
      </div>

      {/* Messages */}
      <div className="card" style={{ flex: 1, borderRadius: 0, padding: '1rem 1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: 'none', borderBottom: 'none' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem' }}><Spinner /></div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '0.84rem', marginTop: '3rem' }}>
            No messages yet. Be the first to say something! 👋
          </div>
        ) : grouped.map(m => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} style={{
              display: 'flex',
              flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: '0.5rem',
              marginTop: m.showAvatar ? '0.75rem' : '0.15rem',
            }}>
              {/* Avatar placeholder to keep alignment */}
              <div style={{ width: 28, flexShrink: 0 }}>
                {m.showAvatar && !isMe && (
                  <Avatar initials={m.sender_initials || m.sender_name?.[0] || '?'} size="sm" />
                )}
              </div>

              <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {m.showAvatar && !isMe && (
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text3)', marginBottom: '0.2rem', paddingLeft: '0.2rem' }}>
                    {m.sender_name} <span style={{ fontWeight: 400, textTransform: 'capitalize' }}>· {m.sender_role}</span>
                  </div>
                )}
                <div style={{
                  padding: '0.55rem 0.9rem',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isMe ? 'var(--teal)' : 'var(--surface2)',
                  color: isMe ? '#fff' : 'var(--text)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  boxShadow: 'var(--shadow-xs)',
                  wordBreak: 'break-word',
                }}>
                  {m.content}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text4)', marginTop: '0.18rem', paddingLeft: '0.2rem', paddingRight: '0.2rem' }}>
                  {timeAgo(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="card" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '0.85rem 1.25rem', display: 'flex', gap: '0.65rem', alignItems: 'flex-end', flexShrink: 0, borderTop: 'none' }}>
        <textarea
          className="form-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message the whole team… (Enter to send)"
          rows={1}
          style={{ flex: 1, minHeight: 42, maxHeight: 120, resize: 'none', borderRadius: 12, padding: '0.6rem 0.9rem' }}
        />
        <button
          className="btn btn-primary"
          onClick={send}
          disabled={sending || !text.trim()}
          style={{ height: 42, width: 42, padding: 0, display: 'grid', placeItems: 'center', borderRadius: 12, flexShrink: 0 }}
        >
          {sending ? <Spinner /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
};
