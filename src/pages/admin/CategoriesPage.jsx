import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Field from '../../components/common/Field.jsx';
import { addCategory, updateCategory, deleteCategory } from '../../services/inventoryService.js';

export default function CategoriesPage() {
  const { db, update } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [err, setErr] = useState('');

  const rows = useMemo(() => db.categories
    .filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map((c) => ({ ...c, count: db.items.filter((i) => i.categoryId === c.id).length })), [db, q]);

  const open = (m, c) => { setModal({ type: m, cat: c }); setForm(c ? { name: c.name, description: c.description } : { name: '', description: '' }); setErr(''); };
  const close = () => { setModal(null); setErr(''); };
  const save = (e) => {
    e.preventDefault();
    const res = update((d) => (modal.type === 'add' ? addCategory(d, form, user.fullName) : updateCategory(d, modal.cat.id, form, user.fullName)));
    if (res.ok === false) return setErr(res.error);
    toast.success(modal.type === 'add' ? 'Category added.' : 'Category updated.'); close();
  };
  const remove = () => {
    const res = update((d) => deleteCategory(d, modal.cat.id, user.fullName));
    if (res.ok === false) toast.error(res.error); else toast.success('Category deleted.');
    close();
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h1 className="page-title mb-0">Categories</h1>
        <button className="btn btn-primary" onClick={() => open('add')}><Plus size={16} className="me-1" />Add Category</button>
      </div>
      <div className="panel mt-3">
        <div className="filters"><div className="search-box"><Search size={16} /><input className="form-control" placeholder="Search categories…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search categories" /></div></div>
        <div className="table-responsive">
          <table className="table align-middle data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Description</th><th className="text-end">Items</th><th className="text-end">Actions</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}><td>{c.id}</td><td><strong>{c.name}</strong></td><td>{c.description || '—'}</td><td className="text-end">{c.count}</td>
                <td className="text-end text-nowrap">
                  <button className="icon-btn sm" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => open('edit', c)}><Pencil size={15} /></button>{' '}
                  <button className="icon-btn sm danger" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => open('delete', c)}><Trash2 size={15} /></button>
                </td></tr>))}</tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty-state text-center py-4">No categories found.</p>}
      </div>
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <Modal title={modal.type === 'add' ? 'Add Category' : 'Edit Category'} onClose={close}>
          <form onSubmit={save} noValidate>
            {err && <div className="alert alert-danger">{err}</div>}
            <Field id="cname" label="Category Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Field id="cdesc" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={close}>Cancel</button><button className="btn btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
      {modal?.type === 'delete' && <ConfirmDialog danger title="Delete category" message={`Delete "${modal.cat.name}"? Categories that still have items cannot be deleted.`} confirmLabel="Delete" onCancel={close} onConfirm={remove} />}
    </>
  );
}
