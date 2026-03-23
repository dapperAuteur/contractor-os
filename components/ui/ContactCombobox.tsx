'use client';

// components/ui/ContactCombobox.tsx
// Styled combobox for selecting or creating a contact inline.
// Used for Client, POC, and Crew Coordinator fields on the job form.
//
// UX:
//  - Click/focus opens a filterable dropdown of saved contacts
//  - Each item shows name + optional phone badge
//  - "Add new contact" at the bottom expands an inline mini-form (name, phone, email)
//  - Selecting a contact fires onChange(name, id) and optionally onPhoneChange(phone)
//  - Creating a contact saves it, fires callbacks, and adds it to the list
//  - ESC or click-outside closes the dropdown

import { useEffect, useId, useRef, useState, useCallback } from 'react';
import { Plus, X, ChevronDown, Loader2, Phone } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Contact {
  id: string;
  name: string;
  contact_type: string;
  phone: string | null;
  email: string | null;
  company_name?: string | null;
}

interface ContactComboboxProps {
  value: string;
  contactId: string | null;
  onChange: (name: string, id: string | null) => void;
  onPhoneChange?: (phone: string | null) => void;
  contactType: 'customer' | 'vendor' | 'location';
  placeholder?: string;
  label?: string;
}

const INPUT_CLS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';

export default function ContactCombobox({
  value,
  contactId,
  onChange,
  onPhoneChange,
  contactType,
  placeholder = 'Search or add…',
}: ContactComboboxProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Load contacts on mount
  useEffect(() => {
    offlineFetch('/api/contacts')
      .then((r) => r.json())
      .then((d) => setContacts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAdd(false);
        setFilter('');
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const filtered = filter
    ? contacts.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : contacts;

  function openDropdown() {
    setFilter(value || '');
    setOpen(true);
    setShowAdd(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function select(contact: Contact) {
    onChange(contact.name, contact.id);
    if (onPhoneChange) onPhoneChange(contact.phone ?? null);
    // Increment use_count silently
    offlineFetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: contact.name, contact_type: contactType }),
    }).catch(() => {});
    setOpen(false);
    setFilter('');
  }

  function clear() {
    onChange('', null);
    if (onPhoneChange) onPhoneChange(null);
    setOpen(false);
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setShowAdd(false); setFilter(''); }
  }, []);

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    setAddError('');
    try {
      const phones = addPhone.trim() ? [{ phone: addPhone.trim(), label: 'mobile', is_primary: true }] : [];
      const emails = addEmail.trim() ? [{ email: addEmail.trim(), label: 'work', is_primary: true }] : [];
      const res = await offlineFetch('/api/contractor/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim(), phones, emails }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
      const { contact: newContact } = await res.json();
      setContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newContact.id)]);
      onChange(newContact.name, newContact.id);
      if (onPhoneChange) onPhoneChange(newContact.phone ?? null);
      setOpen(false);
      setShowAdd(false);
      setAddName(''); setAddPhone(''); setAddEmail('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        className="flex items-center w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm cursor-pointer focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/30"
        onClick={openDropdown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
      >
        <span className={`flex-1 truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="ml-1 text-slate-400 hover:text-slate-600"
            aria-label="Clear"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
        {!value && <ChevronDown size={14} className="text-slate-400 shrink-0" aria-hidden="true" />}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Filter input */}
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Search ${contactType}s…`}
              className="w-full text-sm px-2 py-1.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400"
              aria-label="Filter contacts"
            />
          </div>

          {/* Contact list */}
          <ul id={listboxId} role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && !showAdd && (
              <li className="px-3 py-2 text-sm text-slate-400 text-center">
                {filter ? `No matches for "${filter}"` : 'No contacts yet'}
              </li>
            )}
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === contactId}
                  onClick={() => select(c)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 text-sm hover:bg-amber-50 transition ${c.id === contactId ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-800'}`}
                >
                  <span className="truncate">
                    {c.name}
                    {c.company_name && <span className="text-slate-400 font-normal"> · {c.company_name}</span>}
                  </span>
                  {c.phone && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0 ml-2">
                      <Phone size={11} aria-hidden="true" /> {c.phone}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Add new toggle */}
          {!showAdd ? (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => { setShowAdd(true); setAddName(filter); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition font-medium"
              >
                <Plus size={14} aria-hidden="true" /> Add new contact
              </button>
            </div>
          ) : (
            <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New contact</p>
              <input
                autoFocus
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Name *"
                className={INPUT_CLS}
                aria-label="New contact name"
              />
              <input
                type="tel"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Phone"
                className={INPUT_CLS}
                aria-label="New contact phone"
              />
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Email"
                className={INPUT_CLS}
                aria-label="New contact email"
              />
              {addError && <p className="text-xs text-red-600" role="alert">{addError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddName(''); setAddPhone(''); setAddEmail(''); }}
                  className="flex-1 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || !addName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
