import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, MessageSquare, Edit2, Trash2, CornerUpRight, Check, CheckCheck, X } from 'lucide-react';
import { api } from '../utils/api';
import { Avatar, Spinner, timeAgo, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export const MessagesPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts]         = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]         = useState(null);
  const [messages, setMessages]         = useState([]);
  const [text, setText]                 = useState('');
  const [sending, setSending]           = useState(false);
  const [search, setSearch]             = useState('');
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [editText, setEditText]         = useState('');
  const [activeMenu, setActiveMenu]     = useState(null); // message id with open action menu
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [forwardTo, setForwardTo]       = useState('');
  const bottomRef = useRef();
  const pollRef   = useRef();

  const loadContacts = useCallback(async () => {
    try { setContacts(await api.get('/messages/allowed-contacts')); } catch {}
  }, []);

  const loadConversations = useCallback(async () => {
    try { setConversations(await api.get('/messages/conversations')); } catch {}
  }, []);

  const loadMessages = useCallback(async (userId, showLoader = true) => {
    if (showLoader) setLoadingMsgs(true);
    try { setMessages(await api.get(`/messages/${userId}`)); }
    catch {} finally { if (showLoader) setLoadingMsgs(false); }
  }, []);

  useEffect(() => {
    loadContacts();
    loadConversations();
  }, [loadContacts, loadConversations]);

  // Auto-scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  // Poll for new messages every 4s
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!selected) return;
    pollRef.current = setInterval(() => loadMessages(selected, false), 4000);
    return () => clearInterval(pollRef.current);
  }, [selected, loadMessages]);

  const openConversation = async (userId) => {
    setSelected(userId);
    setActiveMenu(null);
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
      loadConversations();
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      const updated = await api.put(`/messages/${editingId}/edit`, { content: editText.trim() });
      setMessages(prev => prev.map(m => m.id === editingId ? { ...m, ...updated } : m));
      setEditingId(null); setActiveMenu(null);
    } catch (err) { toast.error(err.message); }
  };

  const deleteMsg = async (id) => {
    try {
      await api.delete(`/messages/${id}`);
      setMessages(prev => prev.map(m => m.id === id
        ? { ...m, is_deleted:true, content:'[Message deleted]' } : m));
      setActiveMenu(null);
    } catch (err) { toast.error(err.message); }
  };

  const forwardMsg = async () => {
    if (!forwardTo || !forwardingMsg) return;
    try {
      const msg = await api.post('/messages', {
        receiver_id: forwardTo,
        content: forwardingMsg.content,
        forwarded_from: forwardingMsg.id,
      });
      toast.success('Forwarded');
      setForwardingMsg(null); setForwardTo('');
      if (forwardTo === selected) setMessages(prev => [...prev, msg]);
    } catch (err) { toast.error(err.message); }
  };

  // Build contact list
  const convIds    = new Set(conversations.map(c => c.other_user));
  const newContacts = contacts.filter(c => c.id !== user?.id && !convIds.has(c.id));

  const filteredConvos = conversations.filter(c =>
    !search || c.other_name?.toLowerCase().includes(search.toLowerCase()));
  const filteredNew = newContacts.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  const selectedName  = conversations.find(c => c.other_user === selected)?.other_name
    || contacts.find(c => c.id === selected)?.name || '?';
  const selectedInit  = conversations.find(c => c.other_user === selected)?.other_initials
    || contacts.find(c => c.id === selected)?.avatar_initials || '?';

  const SidebarItem = ({ id, name, initials, unread, lastMsg, lastAt }) => {
    const active = selected === id;
    return (
      <div onClick={() => openConversation(id)} style={{
        display:'flex', alignItems:'center', gap:'0.65rem',
        padding:'0.75rem 1rem', cursor:'pointer',
        background: active ? 'rgba(13,79,85,0.1)' : 'transparent',
        borderLeft: active ? '3px solid var(--teal)' : '3px solid transparent',
        transition:'background 0.15s',
      }}>
        <div style={{ position:'relative' }}>
          <Avatar initials={initials || name?.[0] || '?'} size="md"/>
          {Number(unread) > 0 && (
            <div style={{ position:'absolute', top:-2, right:-2, width:16, height:16, background:'var(--pink)', borderRadius:'50%', fontSize:'0.6rem', color:'#fff', display:'grid', placeItems:'center', fontWeight:700, border:'2px solid var(--surface)' }}>
              {unread}
            </div>
          )}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:'0.84rem', color:'var(--text)' }}>{name}</div>
          {lastMsg && <div style={{ fontSize:'0.72rem', color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lastMsg}</div>}
        </div>
        {lastAt && <div style={{ fontSize:'0.65rem', color:'var(--text4)', flexShrink:0 }}>{timeAgo(lastAt)}</div>}
      </div>
    );
  };

  return (
    <div style={{ display:'flex', height:'calc(100vh - var(--header-h) - 3.5rem)', gap:'1rem' }}>

      {/* Sidebar */}
      <div className="card" style={{ width:265, flexShrink:0, padding:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'1rem', borderBottom:'1.5px solid var(--border)' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', marginBottom:'0.75rem' }}>Messages</div>
          <div className="search-bar" style={{ width:'100%' }}>
            <Search size={13}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ width:'100%' }}/>
          </div>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {filteredConvos.length > 0 && (
            <div style={{ padding:'0.4rem 0.75rem 0.15rem', fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text3)' }}>Recent</div>
          )}
          {filteredConvos.map(c => (
            <SidebarItem key={c.other_user} id={c.other_user} name={c.other_name} initials={c.other_initials}
              unread={c.unread} lastMsg={c.last_message} lastAt={c.last_at}/>
          ))}
          {filteredNew.length > 0 && (
            <div style={{ padding:'0.4rem 0.75rem 0.15rem', fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text3)', marginTop:'0.5rem' }}>New</div>
          )}
          {filteredNew.map(u => (
            <SidebarItem key={u.id} id={u.id} name={u.name} initials={u.avatar_initials}/>
          ))}
          {filteredConvos.length === 0 && filteredNew.length === 0 && (
            <div style={{ padding:'2rem', textAlign:'center', color:'var(--text3)', fontSize:'0.82rem' }}>No contacts yet</div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="card" style={{ flex:1, padding:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!selected ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.75rem' }}>
            <div style={{ width:64, height:64, background:'var(--surface2)', borderRadius:18, display:'grid', placeItems:'center', color:'var(--text4)' }}>
              <MessageSquare size={28}/>
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'var(--text2)' }}>Select a conversation</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding:'0.9rem 1.25rem', borderBottom:'1.5px solid var(--border)', display:'flex', alignItems:'center', gap:'0.75rem', flexShrink:0 }}>
              <Avatar initials={selectedInit} size="md"/>
              <div style={{ fontWeight:700, fontFamily:'var(--font-display)', fontSize:'0.95rem' }}>{selectedName}</div>
            </div>

            {/* Messages list */}
            <div style={{ flex:1, overflowY:'auto', padding:'1rem 1.25rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {loadingMsgs ? (
                <div style={{ display:'flex', justifyContent:'center', paddingTop:'2rem' }}><Spinner/></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign:'center', color:'var(--text3)', fontSize:'0.82rem', marginTop:'2rem' }}>No messages yet. Say hello! 👋</div>
              ) : messages.map(m => {
                const isMe      = m.sender_id === user?.id;
                const isDeleted = m.is_deleted;
                const isEditing = editingId === m.id;
                const menuOpen  = activeMenu === m.id;

                return (
                  <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>

                    {/* Forwarded label */}
                    {m.forwarded_content && (
                      <div style={{ background:'var(--surface2)', borderLeft:'3px solid var(--teal)', borderRadius:'var(--radius)', padding:'0.35rem 0.65rem', fontSize:'0.72rem', color:'var(--text3)', marginBottom:'0.25rem', maxWidth:'70%' }}>
                        ↩ {m.forwarded_from_name}: {m.forwarded_content}
                      </div>
                    )}

                    <div style={{ display:'flex', alignItems:'flex-end', gap:'0.5rem', flexDirection: isMe ? 'row-reverse' : 'row', maxWidth:'80%' }}>
                      {!isMe && <Avatar initials={m.sender_initials||m.sender_name?.[0]||'?'} size="sm"/>}

                      <div style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start', minWidth:0 }}>

                        {/* Edit input */}
                        {isEditing ? (
                          <div style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
                            <input className="form-input" value={editText}
                              onChange={e=>setEditText(e.target.value)}
                              onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape') setEditingId(null); }}
                              style={{ minWidth:200, borderRadius:12, padding:'0.5rem 0.75rem', fontSize:'0.875rem' }}
                              autoFocus/>
                            <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                            <button className="btn btn-ghost btn-sm" onClick={()=>setEditingId(null)}><X size={13}/></button>
                          </div>
                        ) : (
                          /* Message bubble */
                          <div style={{
                            padding:'0.6rem 0.95rem',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isDeleted ? 'var(--surface2)' : isMe ? 'var(--teal)' : 'var(--surface2)',
                            color: isDeleted ? 'var(--text3)' : isMe ? '#fff' : 'var(--text)',
                            fontSize:'0.875rem', lineHeight:1.55,
                            fontStyle: isDeleted ? 'italic' : 'normal',
                            border: isDeleted ? '1px dashed var(--border2)' : 'none',
                            boxShadow:'var(--shadow-xs)',
                            wordBreak:'break-word',
                          }}>
                            {m.content}
                            {m.is_edited && !isDeleted && (
                              <span style={{ fontSize:'0.62rem', opacity:0.6, marginLeft:6 }}>(edited)</span>
                            )}
                          </div>
                        )}

                        {/* Time + read receipt + action buttons */}
                        {!isEditing && (
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:'0.2rem', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                            <span style={{ fontSize:'0.65rem', color:'var(--text4)' }}>{timeAgo(m.created_at)}</span>

                            {/* Read receipt — always visible for sent messages */}
                            {isMe && !isDeleted && (
                              m.is_read
                                ? <CheckCheck size={12} style={{ color:'var(--teal)' }} title="Seen"/>
                                : <Check size={12} style={{ color:'var(--text3)' }} title="Sent"/>
                            )}

                            {/* Action buttons — always visible (not hover-only), small */}
                            {!isDeleted && (
                              <div style={{ display:'flex', gap:2 }}>
                                {isMe && (
                                  <button
                                    onClick={() => { setEditingId(m.id); setEditText(m.content); }}
                                    title="Edit"
                                    style={{ width:22, height:22, borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text3)', display:'grid', placeItems:'center', cursor:'pointer', fontSize:10 }}>
                                    <Edit2 size={10}/>
                                  </button>
                                )}
                                <button
                                  onClick={() => { setForwardingMsg(m); }}
                                  title="Forward"
                                  style={{ width:22, height:22, borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text3)', display:'grid', placeItems:'center', cursor:'pointer' }}>
                                  <CornerUpRight size={10}/>
                                </button>
                                {(isMe || user?.role === 'admin') && (
                                  <button
                                    onClick={() => deleteMsg(m.id)}
                                    title="Delete"
                                    style={{ width:22, height:22, borderRadius:6, border:'1px solid rgba(232,0,138,0.3)', background:'rgba(232,0,138,0.07)', color:'var(--pink)', display:'grid', placeItems:'center', cursor:'pointer' }}>
                                    <Trash2 size={10}/>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef}/>
            </div>

            {/* Input bar */}
            <div style={{ padding:'0.85rem 1.25rem', borderTop:'1.5px solid var(--border)', display:'flex', gap:'0.65rem', alignItems:'flex-end', flexShrink:0 }}>
              <textarea
                className="form-textarea"
                value={text}
                onChange={e=>setText(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); }}}
                placeholder="Type a message… (Enter to send)"
                rows={1}
                style={{ flex:1, minHeight:42, maxHeight:120, resize:'none', borderRadius:12, padding:'0.6rem 0.9rem' }}
              />
              <button
                className="btn btn-primary"
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                style={{ height:42, width:42, padding:0, display:'grid', placeItems:'center', borderRadius:12, flexShrink:0 }}>
                {sending ? <Spinner/> : <Send size={15}/>}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Forward modal */}
      {forwardingMsg && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:300, display:'grid', placeItems:'center', backdropFilter:'blur(4px)' }}
          onClick={()=>setForwardingMsg(null)}>
          <div className="card" style={{ width:340, padding:'1.5rem', margin:'1rem' }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, marginBottom:'0.75rem' }}>Forward Message</div>
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0.65rem 0.9rem', fontSize:'0.82rem', color:'var(--text2)', marginBottom:'1rem', fontStyle:'italic', lineHeight:1.5 }}>
              "{forwardingMsg.content}"
            </div>
            <div className="form-group">
              <label className="form-label">Send to</label>
              <select className="form-select" value={forwardTo} onChange={e=>setForwardTo(e.target.value)}>
                <option value="">Select person…</option>
                {contacts.filter(c=>c.id!==user?.id).map(c=>(
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={()=>setForwardingMsg(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={forwardMsg} disabled={!forwardTo}>
                <CornerUpRight size={13}/> Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
