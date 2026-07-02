import { useState, useEffect } from 'react';
import { HardDrive, Save, ExternalLink, X } from 'lucide-react';
import { api } from '../utils/api';
import { Spinner, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const buildEmbedUrl = (link) => {
  if (!link) return null;
  const folderMatch = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#list`;
  const fileMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  try {
    const url = new URL(link);
    const id = url.searchParams.get('id');
    if (id) return `https://drive.google.com/embeddedfolderview?id=${id}#list`;
  } catch {}
  if (link.includes('docs.google.com')) return link.replace('/edit','').replace('/view','') + '/preview';
  return link;
};

export const DrivePage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ folder_link: '', label: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // GET /api/drive — correct path
    api.get('/drive').then(d => {
      if (d) setSettings({ folder_link: d.folder_link || '', label: d.label || '' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings.folder_link.trim()) return toast.error('Please enter a Drive link');
    setSaving(true);
    try {
      // POST /api/drive — correct path
      const saved = await api.post('/drive', settings);
      setSettings({ folder_link: saved.folder_link || '', label: saved.label || '' });
      toast.success('Drive link saved');
      setEditing(false);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const embedUrl = buildEmbedUrl(settings.folder_link);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><Spinner size="spinner-lg" /></div>;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Google Drive</h1>
          <p className="text-sm text-muted">{settings.label || 'Team workspace'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {settings.folder_link && (
            <a href={settings.folder_link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <ExternalLink size={13} /> Open in Drive
            </a>
          )}
          {user?.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(e => !e)}>
              <HardDrive size={13} /> {editing ? 'Cancel' : 'Set Link'}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <div className="card-title">Configure Google Drive Folder</div>
            <button className="btn btn-ghost btn-icon" onClick={() => setEditing(false)}><X size={14} /></button>
          </div>
          <div className="form-group">
            <label className="form-label">Google Drive Folder Link</label>
            <input className="form-input" value={settings.folder_link}
              onChange={e => setSettings(s => ({ ...s, folder_link: e.target.value }))}
              placeholder="https://drive.google.com/drive/folders/YOUR_FOLDER_ID" />
            <div className="form-hint">
              Right-click your Drive folder → Share → Change to "Anyone with link can view" → Copy link → paste here.
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Label (optional)</label>
            <input className="form-input" value={settings.label}
              onChange={e => setSettings(s => ({ ...s, label: e.target.value }))}
              placeholder="Filmelo Media — Project Files" />
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Spinner /> : <><Save size={14} /> Save Drive Link</>}
          </button>
        </div>
      )}

      {!settings.folder_link ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ width: 64, height: 64, background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 18, display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem', color: 'var(--text4)' }}>
              <HardDrive size={28} />
            </div>
            <h3 style={{ marginBottom: '0.4rem' }}>No Drive folder linked</h3>
            <p style={{ maxWidth: 340, margin: '0 auto 1.5rem' }}>
              {user?.role === 'admin'
                ? 'Click "Set Link" above and paste your Google Drive folder URL to embed the full Drive here.'
                : 'The admin has not linked a Google Drive folder yet.'}
            </p>
            {user?.role === 'admin' && (
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '1rem', fontSize: '0.8rem', color: 'var(--text2)', textAlign: 'left', maxWidth: 440, margin: '0 auto' }}>
                <strong>Steps to get the folder link:</strong>
                <ol style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: 2.2 }}>
                  <li>Open Google Drive in your browser</li>
                  <li>Right-click your project folder → <strong>Share</strong></li>
                  <li>Under "General access" set to <strong>"Anyone with the link"</strong></li>
                  <li>Click <strong>Copy link</strong> and paste it above</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <iframe
            src={embedUrl}
            style={{ width: '100%', height: 'calc(100vh - var(--header-h) - 120px)', minHeight: 500, border: 'none', display: 'block' }}
            title="Google Drive"
            allow="autoplay"
          />
        </div>
      )}
    </>
  );
};
