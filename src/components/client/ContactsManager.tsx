import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  FolderGit2,
  Edit2,
  RefreshCw,
  Phone,
  Mail,
  Tag,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../api';
import { Contact, ContactGroup } from '../../types';
import { ContactImportModal } from './ContactImportModal';
import { generateSampleCsv } from '../../utils/csvParser';

export const ContactsManager: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    group_id: '',
    custom1: '',
    custom2: '',
    custom3: '',
    custom4: '',
    custom5: ''
  });
  const [metaEntries, setMetaEntries] = useState<Array<{ key: string; value: string }>>([]);
  const [formError, setFormError] = useState<string>('');

  // Group creation form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const [cRes, gRes] = await Promise.all([
        api.getContacts({
          search: search || undefined,
          groupId: selectedGroup || undefined,
          limit: 200
        }),
        api.getGroups()
      ]);

      if (cRes.success) setContacts(cRes.contacts);
      if (gRes.success) setGroups(gRes.groups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, selectedGroup]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      group_id: selectedGroup || '',
      custom1: '',
      custom2: '',
      custom3: '',
      custom4: '',
      custom5: ''
    });
    setMetaEntries([]);
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      group_id: contact.group_id || '',
      custom1: contact.custom1 || '',
      custom2: contact.custom2 || '',
      custom3: contact.custom3 || '',
      custom4: contact.custom4 || '',
      custom5: contact.custom5 || ''
    });
    if (contact.metadata && Object.keys(contact.metadata).length > 0) {
      setMetaEntries(Object.entries(contact.metadata).map(([key, value]) => ({ key, value })));
    } else {
      setMetaEntries([]);
    }
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError('Name and Phone number are required.');
      return;
    }

    const metadataObj: Record<string, string> = {};
    metaEntries.forEach((entry) => {
      if (entry.key.trim() && entry.value.trim()) {
        metadataObj[entry.key.trim()] = entry.value.trim();
      }
    });

    const payload = {
      ...formData,
      metadata: metadataObj
    };

    try {
      if (editingContact) {
        const res = await api.updateContact(editingContact.id, payload);
        if (!res.success) {
          setFormError(res.error || 'Failed to update contact');
          return;
        }
      } else {
        const res = await api.createContact(payload);
        if (!res.success) {
          setFormError(res.error || 'Failed to create contact');
          return;
        }
      }
      setIsAddEditModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    await api.deleteContact(id);
    fetchContacts();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected contacts?`)) return;
    await api.bulkDeleteContacts(Array.from(selectedIds));
    setSelectedIds(new Set());
    fetchContacts();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await api.createGroup(newGroupName, newGroupDesc);
    setNewGroupName('');
    setNewGroupDesc('');
    const gRes = await api.getGroups();
    if (gRes.success) setGroups(gRes.groups);
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group? Associated contacts will remain unassigned.')) return;
    await api.deleteGroup(id);
    if (selectedGroup === id) setSelectedGroup('');
    const gRes = await api.getGroups();
    if (gRes.success) setGroups(gRes.groups);
  };

  const exportContactsCsv = () => {
    // Collect all dynamic metadata keys across all contacts
    const metadataKeySet = new Set<string>();
    contacts.forEach((c) => {
      if (c.metadata) {
        Object.keys(c.metadata).forEach((k) => metadataKeySet.add(k));
      }
    });
    const metadataKeys = Array.from(metadataKeySet);

    const headers = [
      'ID',
      'Name',
      'Phone',
      'Email',
      'Group',
      'Custom 1',
      'Custom 2',
      'Custom 3',
      'Custom 4',
      'Custom 5',
      ...metadataKeys.map((k) => `Metadata: ${k}`)
    ];

    const rows = contacts.map((c) => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.phone,
      c.email || '',
      `"${(groups.find((g) => g.id === c.group_id)?.name || '').replace(/"/g, '""')}"`,
      `"${(c.custom1 || '').replace(/"/g, '""')}"`,
      `"${(c.custom2 || '').replace(/"/g, '""')}"`,
      `"${(c.custom3 || '').replace(/"/g, '""')}"`,
      `"${(c.custom4 || '').replace(/"/g, '""')}"`,
      `"${(c.custom5 || '').replace(/"/g, '""')}"`,
      ...metadataKeys.map((k) => `"${(c.metadata?.[k] || '').replace(/"/g, '""')}"`)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contacts_with_metadata_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSampleTemplate = () => {
    const sample = generateSampleCsv();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_whatsapp_contacts_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Contacts & Segments</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage client audience, phone uniqueness, and custom personalisation variables.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={downloadSampleTemplate}
            className="hidden sm:flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
            title="Download CSV format template"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV Template</span>
          </button>

          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
          >
            <FolderGit2 className="w-4 h-4 text-emerald-400" />
            <span>Manage Groups ({groups.length})</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Bulk Import</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 w-full sm:w-auto flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, phone (+91...), custom1..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Groups ({groups.reduce((acc, g) => acc + (g.contact_count || 0), 0)} contacts)</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.contact_count || 0})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}

          <button
            onClick={exportContactsCsv}
            disabled={contacts.length === 0}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedIds.size === contacts.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Name & Email</th>
                <th className="py-3 px-4">WhatsApp Phone</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Custom Fields (Variables)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading contacts...</span>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">No contacts found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {search ? 'Try clearing your search query' : 'Add your first contact or bulk import a CSV file'}
                    </p>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const group = groups.find(g => g.id === contact.group_id);
                  const isChecked = selectedIds.has(contact.id);

                  return (
                    <tr
                      key={contact.id}
                      className={`hover:bg-slate-800/40 transition-colors ${isChecked ? 'bg-emerald-950/20' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(contact.id)}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{contact.name}</div>
                        {contact.email && (
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-emerald-400 font-medium flex items-center space-x-1.5">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span>{contact.phone}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {group ? (
                          <span className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            {group.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 text-[10px] max-w-sm">
                          {contact.custom1 && (
                            <span className="bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded text-slate-300">
                              c1: <strong className="text-slate-200">{contact.custom1}</strong>
                            </span>
                          )}
                          {contact.custom2 && (
                            <span className="bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded text-slate-300">
                              c2: <strong className="text-slate-200">{contact.custom2}</strong>
                            </span>
                          )}
                          {contact.metadata &&
                            Object.entries(contact.metadata).slice(0, 3).map(([k, v]) => (
                              <span
                                key={k}
                                className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 px-1.5 py-0.5 rounded font-mono"
                              >
                                {k}: <strong className="text-emerald-200">{String(v)}</strong>
                              </span>
                            ))}
                          {contact.metadata && Object.keys(contact.metadata).length > 3 && (
                            <span
                              className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[9px] cursor-help font-mono"
                              title={Object.entries(contact.metadata)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join('\n')}
                            >
                              +{Object.keys(contact.metadata).length - 3} more
                            </span>
                          )}
                          {!contact.custom1 &&
                            !contact.custom2 &&
                            !contact.custom3 &&
                            (!contact.metadata || Object.keys(contact.metadata).length === 0) && (
                              <span className="text-slate-500 italic text-[11px]">None</span>
                            )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(contact)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                            title="Edit Contact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Contact Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {editingContact ? 'Edit Contact' : 'Create Contact'}
              </h2>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">WhatsApp Phone (E.164) *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+919876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contact Group</label>
                  <select
                    value={formData.group_id}
                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- No Group / Unassigned --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 mb-2">
                  Personalisation Variables (Used in WhatsApp Templates)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-0.5">Custom 1 (e.g. Order ID, Customer ID)</label>
                    <input
                      type="text"
                      value={formData.custom1}
                      onChange={(e) => setFormData({ ...formData, custom1: e.target.value })}
                      placeholder="VIP-101"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-0.5">Custom 2 (e.g. Branch, City)</label>
                    <input
                      type="text"
                      value={formData.custom2}
                      onChange={(e) => setFormData({ ...formData, custom2: e.target.value })}
                      placeholder="Downtown"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-0.5">Custom 3 (e.g. Tier)</label>
                    <input
                      type="text"
                      value={formData.custom3}
                      onChange={(e) => setFormData({ ...formData, custom3: e.target.value })}
                      placeholder="Gold Member"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-0.5">Custom 4 (e.g. Discount, Amount)</label>
                    <input
                      type="text"
                      value={formData.custom4}
                      onChange={(e) => setFormData({ ...formData, custom4: e.target.value })}
                      placeholder="20% Off"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-slate-400">
                    Dynamic Customer Metadata (Custom Attributes)
                  </p>
                  <button
                    type="button"
                    onClick={() => setMetaEntries([...metaEntries, { key: '', value: '' }])}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Metadata Field</span>
                  </button>
                </div>

                {metaEntries.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No custom metadata attributes attached.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {metaEntries.map((entry, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Attribute key (e.g. city, tier)"
                          value={entry.key}
                          onChange={(e) => {
                            const next = [...metaEntries];
                            next[idx].key = e.target.value;
                            setMetaEntries(next);
                          }}
                          className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-mono text-[11px]"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. Mumbai, Gold)"
                          value={entry.value}
                          onChange={(e) => {
                            const next = [...metaEntries];
                            next[idx].value = e.target.value;
                            setMetaEntries(next);
                          }}
                          className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => setMetaEntries(metaEntries.filter((_, i) => i !== idx))}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Management Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderGit2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Manage Contact Groups</h2>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-300">
              {/* Add Group Form */}
              <form onSubmit={handleCreateGroup} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-semibold text-white">Create New Group</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Group Name (e.g. VIP Customers)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Description (Optional)"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
                >
                  Add Group
                </button>
              </form>

              {/* Groups List */}
              <div className="space-y-2">
                <h3 className="font-semibold text-white">Existing Groups</h3>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  {groups.map(g => (
                    <div key={g.id} className="p-3 bg-slate-950/60 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white flex items-center space-x-2">
                          <span>{g.name}</span>
                          <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.2 rounded-full">
                            {g.contact_count || 0} contacts
                          </span>
                        </div>
                        {g.description && <p className="text-[11px] text-slate-400 mt-0.5">{g.description}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        className="text-slate-400 hover:text-rose-400 p-1.5 cursor-pointer"
                        title="Delete Group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <ContactImportModal
          groups={groups}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={(targetGroupId) => {
            if (targetGroupId) {
              setSelectedGroup(targetGroupId);
            }
            fetchContacts();
          }}
        />
      )}
    </div>
  );
};
