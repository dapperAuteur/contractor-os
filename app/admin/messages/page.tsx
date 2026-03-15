'use client';

// app/admin/messages/page.tsx
// Admin compose and send messages to users (rich text with Tiptap) + reply threads.

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Users, CheckCircle, AlertTriangle, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import MediaUploader from '@/components/ui/MediaUploader';
import ImageLightbox from '@/components/ui/ImageLightbox';

// Tiptap is SSR-unfriendly — load client-side only
const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'free', label: 'Free tier only' },
  { value: 'monthly', label: 'Monthly subscribers' },
  { value: 'lifetime', label: 'Lifetime members' },
  { value: 'user', label: 'Specific user (by email)' },
] as const;

interface SentMessage {
  id: string;
  subject: string;
  body: string;
  recipient_scope: string;
  created_at: string;
  message_reads: [{ count: number }];
}

interface Reply {
  id: string;
  is_admin: boolean;
  body: string;
  media_url?: string | null;
  created_at: string;
}

interface ThreadState {
  replies: Reply[];
  loaded: boolean;
}

type SortKey = 'created_at' | 'subject' | 'recipient_scope' | 'reads';
type SortDir = 'asc' | 'desc';

function SortTh({
  label, col, sortKey, sortDir, onSort,
}: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      aria-label={`Sort by ${label}`}
      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition min-h-11"
    >
      {label}
      {active
        ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-amber-600" /> : <ChevronDown className="w-3 h-3 text-amber-600" />)
        : <ChevronUp className="w-3 h-3 opacity-20" />
      }
    </button>
  );
}


export default function AdminMessagesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>}>
      <AdminMessagesPage />
    </Suspense>
  );
}

function AdminMessagesPage() {
  const searchParams = useSearchParams();
  const prefilled = useRef(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState<string>('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Thread state for sent messages
  const [expanded, setExpanded] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, ThreadState>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyMedia, setReplyMedia] = useState<Record<string, string | null>>({});
  const [replySending, setReplySending] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/admin/messages')
      .then((r) => r.json())
      .then((d) => setSent(d.messages ?? []));
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); }
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sortedSent = [...sent].sort((a, b) => {
    if (sortKey === 'reads') {
      const cmp = (a.message_reads?.[0]?.count ?? 0) - (b.message_reads?.[0]?.count ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    }
    const av = sortKey === 'subject' ? a.subject : sortKey === 'recipient_scope' ? a.recipient_scope : a.created_at;
    const bv = sortKey === 'subject' ? b.subject : sortKey === 'recipient_scope' ? b.recipient_scope : b.created_at;
    const cmp = av.localeCompare(bv);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleExpand = useCallback(async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!threads[id]?.loaded) {
      const r = await fetch(`/api/admin/messages/${id}`);
      const d = await r.json();
      setThreads((prev) => ({ ...prev, [id]: { replies: d.replies ?? [], loaded: true } }));
    }
  }, [expanded, threads]);

  async function sendThreadReply(id: string) {
    const replyBody = (replyText[id] ?? '').trim();
    if (!replyBody) return;
    setReplySending(id);
    setReplyError((prev) => ({ ...prev, [id]: '' }));
    try {
      const r = await fetch(`/api/admin/messages/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody, media_url: replyMedia[id] || null }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? 'Failed'); }
      const newReply: Reply = {
        id: Date.now().toString(),
        is_admin: true,
        body: replyBody,
        media_url: replyMedia[id] || null,
        created_at: new Date().toISOString(),
      };
      setThreads((prev) => ({
        ...prev,
        [id]: { ...prev[id], replies: [...(prev[id]?.replies ?? []), newReply] },
      }));
      setReplyText((prev) => ({ ...prev, [id]: '' }));
      setReplyMedia((prev) => ({ ...prev, [id]: null }));
    } catch (e) {
      setReplyError((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : 'Failed' }));
    } finally {
      setReplySending(null);
    }
  }

  async function lookupUserByEmail(email?: string) {
    const emailToLookup = email || targetEmail;
    if (!emailToLookup) return;
    setLookingUp(true);
    setTargetId(null);
    try {
      const res = await fetch(`/api/admin/users`);
      const d = await res.json();
      const found = (d.users ?? []).find((u: { email: string; id: string }) =>
        u.email?.toLowerCase() === emailToLookup.toLowerCase()
      );
      if (found) {
        setTargetId(found.id);
      } else {
        setResult({ type: 'err', text: 'No user found with that email.' });
      }
    } catch {
      setResult({ type: 'err', text: 'Lookup failed.' });
    } finally {
      setLookingUp(false);
    }
  }

  // Pre-fill from URL params (e.g. from admin course management)
  useEffect(() => {
    if (prefilled.current) return;
    const emailParam = searchParams.get('email');
    const subjectParam = searchParams.get('subject');
    if (emailParam) {
      prefilled.current = true;
      setScope('user');
      setTargetEmail(emailParam);
      if (subjectParam) setSubject(subjectParam);
      lookupUserByEmail(emailParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function sendMessage() {
    const plainBody = body.replace(/<[^>]*>/g, '').trim();
    if (!subject.trim() || !plainBody) {
      setResult({ type: 'err', text: 'Subject and body are required.' });
      return;
    }
    if (scope === 'user' && !targetId) {
      setResult({ type: 'err', text: 'Look up a user first.' });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, body,
          recipient_scope: scope,
          recipient_user_id: scope === 'user' ? targetId : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setResult({ type: 'ok', text: `Sent to ${d.sent} / ${d.total} recipients.` });
      setSubject('');
      setBody('');
      fetch('/api/admin/messages').then((r) => r.json()).then((d) => setSent(d.messages ?? []));
    } catch (e) {
      setResult({ type: 'err', text: e instanceof Error ? e.message : 'Failed to send' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Messages</h1>
      <p className="text-slate-500 text-sm mb-8">
        Send in-app notifications + emails to your users. Users can reply — threads appear below each message.
      </p>

      {/* Compose */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
        <h2 className="font-semibold text-slate-900 mb-4">Compose Message</h2>

        {/* Recipient scope */}
        <div className="mb-4">
          <p className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recipients</p>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setScope(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition min-h-11 ${scope === o.value ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* User lookup */}
        {scope === 'user' && (
          <div className="mb-4 flex gap-2">
            <label htmlFor="admin-recipient-email" className="sr-only">Recipient email address</label>
            <input
              id="admin-recipient-email"
              type="email"
              placeholder="user@example.com"
              value={targetEmail}
              onChange={(e) => { setTargetEmail(e.target.value); setTargetId(null); }}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
            />
            <button
              type="button"
              onClick={() => lookupUserByEmail()}
              disabled={lookingUp}
              className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-sm font-semibold hover:bg-slate-200 transition disabled:opacity-50 min-h-11"
            >
              {lookingUp ? 'Looking up…' : 'Look up'}
            </button>
            {targetId && <span className="flex items-center gap-1 text-green-500 text-xs"><CheckCircle className="w-3 h-3" /> Found</span>}
          </div>
        )}

        {/* Subject */}
        <div className="mb-3">
          <label htmlFor="admin-msg-subject" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Subject</label>
          <input
            id="admin-msg-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Important update from Work.WitUS"
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        {/* Rich text body */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Message{' '}
            <span className="normal-case text-slate-500 font-normal">(bold, italic, links, images supported)</span>
          </label>
          <RichTextEditor
            value={body}
            onChange={setBody}
            placeholder="Write your message here…"
          />
        </div>

        {result && (
          <div role="alert" className={`flex items-center gap-2 rounded-lg px-4 py-3 mb-4 text-sm ${result.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {result.text}
          </div>
        )}

        <button
          type="button"
          onClick={sendMessage}
          disabled={sending}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition font-semibold text-sm disabled:opacity-60 min-h-11"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending…' : 'Send Message'}
        </button>
      </div>

      {/* Sent messages with reply threads */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900">Sent Messages</h2>
        {sent.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Sort:</span>
            <SortTh label="Date" col="created_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortTh label="Subject" col="subject" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortTh label="Scope" col="recipient_scope" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortTh label="Reads" col="reads" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          </div>
        )}
      </div>

      {sortedSent.length === 0 ? (
        <p className="text-slate-500 text-sm">No messages sent yet.</p>
      ) : (
        <div className="space-y-3">
          {sortedSent.map((m) => {
            const isOpen = expanded === m.id;
            const thread = threads[m.id];
            const userReplies = thread?.replies?.filter((r) => !r.is_admin) ?? [];
            return (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Message header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(m.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start gap-4 p-4 hover:bg-slate-50 transition text-left min-h-11"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 text-sm">{m.subject}</p>
                      {userReplies.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-600 text-white text-xs font-bold rounded-full">
                          {userReplies.length}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      To: <span className="text-slate-700">{m.recipient_scope}</span> · {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="w-3 h-3" />
                      {m.message_reads?.[0]?.count ?? 0} read
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>

                {/* Expanded thread */}
                {isOpen && (
                  <div className="border-t border-slate-200 px-5 py-4 space-y-4">
                    {/* Original body */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Original Message</p>
                      {m.body.startsWith('<') ? (
                        <div
                          className="prose prose-sm max-w-none text-slate-700"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.body) }}
                        />
                      ) : (
                        <p className="text-slate-700 text-sm whitespace-pre-wrap">{m.body}</p>
                      )}
                    </div>

                    {/* Reply thread */}
                    {!thread?.loaded && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      </div>
                    )}

                    {thread?.loaded && thread.replies.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Replies</p>
                        {thread.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`flex ${reply.is_admin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                              reply.is_admin
                                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                                : 'bg-slate-100 border border-slate-200 text-slate-800'
                            }`}>
                              <p className={`text-xs font-semibold mb-1 ${reply.is_admin ? 'text-amber-600' : 'text-slate-500'}`}>
                                {reply.is_admin ? 'You (Admin)' : 'User'}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                              {reply.media_url && <ImageLightbox url={reply.media_url} />}
                              <p className="text-xs opacity-50 mt-1.5 text-right">
                                {new Date(reply.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply form */}
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-3">
                        Reply{m.recipient_scope !== 'user' ? ' (only works for direct messages to specific users)' : ''}
                      </p>
                      <textarea
                        value={replyText[m.id] ?? ''}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        rows={3}
                        placeholder="Write your reply…"
                        aria-label="Reply to message"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 resize-none"
                      />
                      <div className="flex items-center justify-between mt-3 gap-3">
                        <MediaUploader
                          onUpload={(url) => setReplyMedia((prev) => ({ ...prev, [m.id]: url }))}
                          onRemove={() => setReplyMedia((prev) => ({ ...prev, [m.id]: null }))}
                          currentUrl={replyMedia[m.id]}
                          label="Attach media"
                        />
                        <div className="flex items-center gap-3">
                          {replyError[m.id] && (
                            <p role="alert" className="text-xs text-red-400">{replyError[m.id]}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => sendThreadReply(m.id)}
                            disabled={replySending === m.id || !(replyText[m.id] ?? '').trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-500 transition disabled:opacity-50 min-h-11"
                          >
                            {replySending === m.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Send className="w-4 h-4" />
                            }
                            {replySending === m.id ? 'Sending…' : 'Send Reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
