import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Receipt, CheckCircle } from 'lucide-react';
import { api } from '../../utils/api';
import { Modal, Confirm, Badge, EmptyState, Spinner, fmtDate, fmtCurrency, toast } from '../../components/ui';

const InvoiceForm = ({ initial, clients, projects, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { client_id: '', project_id: '', amount: '', due_date: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Client *</label>
          <select className="form-select" value={form.client_id} onChange={set('client_id')} required>
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Project</label>
          <select className="form-select" value={form.project_id} onChange={set('project_id')}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Amount (USD) *</label>
          <input className="form-input" type="number" step="0.01" value={form.amount} onChange={set('amount')} required placeholder="2500.00" />
        </div>
        <div className="form-group">
          <label className="form-label">Due Date</label>
          <input className="form-input" type="date" value={form.due_date} onChange={set('due_date')} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Invoice notes or payment instructions…" />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : (initial ? 'Save Changes' : 'Create Invoice')}
        </button>
      </div>
    </form>
  );
};

export const InvoicesPage = ({ readOnly = false }) => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [del, setDel] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, c, p] = await Promise.all([api.get('/invoices'), api.get('/clients'), api.get('/projects')]);
      setInvoices(inv); setClients(c); setProjects(p);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(i => {
    const q = search.toLowerCase();
    return !q || i.invoice_number?.toLowerCase().includes(q) || i.client_name?.toLowerCase().includes(q);
  });

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0);

  const handleSave = async (form) => {
    const created = await api.post('/invoices', form);
    setInvoices(prev => [created, ...prev]);
    toast.success('Invoice created');
  };

  const markPaid = async (inv) => {
    const updated = await api.put(`/invoices/${inv.id}`, { status: 'paid', paid_date: new Date().toISOString().split('T')[0] });
    setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
    toast.success('Invoice marked as paid');
  };

  const handleDelete = async () => {
    await api.delete(`/invoices/${del.id}`);
    setInvoices(prev => prev.filter(i => i.id !== del.id));
    toast.success('Invoice deleted');
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Invoices</h1>
          <p className="text-sm text-muted">{invoices.length} invoices</p>
        </div>
        {!readOnly && <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={15}/> New Invoice</button>}
      </div>

      {!readOnly && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon green"><Receipt size={18}/></div>
            <div className="stat-info"><div className="stat-value">{fmtCurrency(totalPaid)}</div><div className="stat-label">Total Paid</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Receipt size={18}/></div>
            <div className="stat-info"><div className="stat-value">{fmtCurrency(totalPending)}</div><div className="stat-label">Pending</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><Receipt size={18}/></div>
            <div className="stat-info"><div className="stat-value">{invoices.length}</div><div className="stat-label">Total Invoices</div></div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div className="search-bar"><Search size={14}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…" /></div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Receipt size={40}/>} title="No invoices" description="Create your first invoice" action={!readOnly && <button className="btn btn-primary" onClick={() => setModal('add')}><Plus size={14}/> New Invoice</button>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice #</th><th>Client</th><th>Project</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Paid</th>{!readOnly && <th></th>}</tr></thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id}>
                    <td><span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text)' }}>{i.invoice_number}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{i.client_name || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{i.project_title || '—'}</td>
                    <td><span style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtCurrency(i.amount)}</span></td>
                    <td><Badge status={i.status} /></td>
                    <td style={{ fontSize: '0.8rem' }}>{fmtDate(i.due_date)}</td>
                    <td style={{ fontSize: '0.8rem' }}>{fmtDate(i.paid_date)}</td>
                    {!readOnly && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {i.status === 'pending' && (
                            <button className="btn btn-ghost btn-icon" style={{ color: 'var(--green)' }} onClick={() => markPaid(i)} title="Mark paid"><CheckCircle size={13}/></button>
                          )}
                          <button className="btn btn-danger btn-icon" onClick={() => setDel(i)} title="Delete"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title="New Invoice" size="modal-lg">
        {modal && <InvoiceForm clients={clients} projects={projects} onSave={handleSave} onClose={() => setModal(null)} />}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={handleDelete} title="Delete Invoice" message={`Delete invoice ${del?.invoice_number}?`} danger />
    </>
  );
};
