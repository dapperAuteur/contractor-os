'use client';

// app/admin/feedback/page.tsx
// Admin feedback: one expandable conversation per user, with realtime push.
// All submissions + replies shown as a unified chronological chat thread.

import { useEffect, useState, useCallback, useRef } from 'react';
import { Bug, Lightbulb, MessageSquare, ChevronDown, ChevronUp, Send, Loader2, Users, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MediaUploader from '@/components/ui/MediaUploader';
import ImageLightbox from '@/components/ui/ImageLightbox';

interface ConversationMessage {
  id: string;
  type: 'submission' | 'reply';
  is_admin: boolean;
  body: string;
  category?: string;
  media_url?: string | null;
  created_at: string;
  app?: string | null;
  feedback_id: string;
}

interface Conversation {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
  unread_count: number;
  last_activity: string;
  apps: string[];
  messages: ConversationMessage[];
  latest_feedback_id: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  bug: Bug, feature: Lightbulb, general: MessageSquare,
};
const CATEGORY_COLORS: Record<string, string> = {
  bug: 'text-red-400', feature: 'text-purple-400', general: 'text-slate-500',
};

function fmtDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AppBadge({ app }: { app?: string | null }) {
  if (!app || app === 'centenarian') return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
      {app}
    </span>
  );
}

function MessageBubble({ msg }: { msg: ConversationMessage }) {
  const isUser = !msg.is_admin;
  const CatIcon = msg.category ? (CATEGORY_ICONS[msg.category] ?? MessageSquare) : null;
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} gap-2`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-slate-100 border border-slate-200 rounded-tl-sm'
          : 'bg-amber-50 border border-amber-200 rounded-tr-sm'
      }`}>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {isUser && CatIcon && (
            <CatIcon className={`w-3 h-3 shrink-0 ${CATEGORY_COLORS[msg.category ?? ''] ?? 'text-slate-500'}`} aria-hidden="true" />
          )}
          {isUser && msg.category && (
            <span className={`text-xs font-semibold capitalize ${CATEGORY_COLORS[msg.category] ?? 'text-slate-500'}`}>
              {msg.category === 'feature' ? 'Feature Request' : msg.category === 'bug' ? 'Bug Report' : 'General'}
            </span>
          )}
          {!isUser && <span className="text-xs font-semibold text-amber-600">You (Admin)</span>}
          <AppBadge app={msg.app} />
        </div>
        <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.body}</p>
        {msg.media_url && <ImageLightbox url={msg.media_url} />}
        <p className="text-xs text-slate-400 mt-1.5 text-right">{fmtDate(msg.created_at)}</p>
      </div>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyMedia, setReplyMedia] = useState<Record<string, string | null>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [sendError, setSendError] = useState<Record<string, string>>({});
  const threadRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/feedback/conversations')
      .then((r) => r.json())
      .then((d) => { setConversations(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll thread to bottom when expanded or new messages arrive
  useEffect(() => {
    if (expanded) {
      const el = threadRefs.current[expanded];
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [expanded, conversations]);

  // Realtime: new submission or reply → update state immediately
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-feedback-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_feedback' }, () => {
        // New submission from a user — reload to get full profile info
        load();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_replies' }, (payload) => {
        const r = payload.new as {
          id: string; feedback_id: string; is_admin: boolean;
          body: string; media_url: string | null; created_at: string; sender_id: string;
        };
        const newMsg: ConversationMessage = {
          id: r.id, type: 'reply', is_admin: r.is_admin,
          body: r.body, media_url: r.media_url,
          created_at: r.created_at, feedback_id: r.feedback_id,
        };
        setConversations((prev) => {
          // Find which conversation owns this feedback_id
          const idx = prev.findIndex((conv) =>
            conv.messages.some((m) => m.id === r.feedback_id || m.feedback_id === r.feedback_id)
          );
          if (idx === -1) return prev;
          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.messages = [...conv.messages, newMsg].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          conv.last_activity = r.created_at;
          updated[idx] = conv;
          // Re-sort conversations by last_activity
          return updated.sort((a, b) =>
            new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
          );
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function sendReply(userId: string) {
    const body = (replyText[userId] ?? '').trim();
    if (!body) return;
    setSending(userId);
    setSendError((prev) => ({ ...prev, [userId]: '' }));
    try {
      const res = await fetch(`/api/admin/feedback/user/${userId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, media_url: replyMedia[userId] || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
      setReplyText((prev) => ({ ...prev, [userId]: '' }));
      setReplyMedia((prev) => ({ ...prev, [userId]: null }));
      // Reply will appear via realtime subscription
    } catch (e) {
      setSendError((prev) => ({ ...prev, [userId]: e instanceof Error ? e.message : 'Failed to send' }));
    } finally {
      setSending(null);
    }
  }

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">User Feedback</h1>
      <p className="text-slate-500 text-sm mb-6">
        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        {totalUnread > 0 && ` · ${totalUnread} unread`}
        {' '}· Live updates on
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Conversations', value: conversations.length, icon: Users },
          { label: 'Unread', value: totalUnread, icon: Inbox },
          { label: 'Total Messages', value: conversations.reduce((s, c) => s + c.messages.length, 0), icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <Icon className="w-5 h-5 mx-auto mb-2 text-amber-500" aria-hidden="true" />
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No feedback yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const isOpen = expanded === conv.user_id;
            const lastMsg = conv.messages[conv.messages.length - 1];
            const displayName = conv.display_name ?? conv.username ?? conv.email ?? conv.user_id.slice(0, 8);

            return (
              <div key={conv.user_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : conv.user_id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-100/60 transition text-left"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${conv.unread_count > 0 ? 'bg-amber-500' : 'bg-transparent'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-slate-800 text-sm font-semibold">{displayName}</p>
                      {conv.username && conv.display_name && (
                        <span className="text-slate-400 text-xs">@{conv.username}</span>
                      )}
                      {conv.apps.filter((a) => a !== 'centenarian').map((app) => (
                        <AppBadge key={app} app={app} />
                      ))}
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">{lastMsg?.body ?? '—'}</p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {conv.unread_count > 0 && (
                      <span className="text-xs font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded-full min-w-5 text-center">
                        {conv.unread_count}
                      </span>
                    )}
                    <span className="text-slate-400 text-xs">{fmtDate(conv.last_activity)}</span>
                    <span className="text-slate-500 text-xs">{conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}</span>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-slate-500" />
                      : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>

                {/* Conversation thread */}
                {isOpen && (
                  <div className="border-t border-slate-200">
                    <div
                      ref={(el) => { threadRefs.current[conv.user_id] = el; }}
                      className="px-4 py-4 space-y-3 max-h-96 overflow-y-auto"
                    >
                      {conv.messages.map((msg) => (
                        <MessageBubble key={`${msg.type}-${msg.id}`} msg={msg} />
                      ))}
                    </div>

                    <div className="px-4 pb-4 pt-2 border-t border-slate-200">
                      <textarea
                        value={replyText[conv.user_id] ?? ''}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [conv.user_id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(conv.user_id);
                        }}
                        rows={2}
                        placeholder="Reply to user… (⌘↵ to send)"
                        aria-label="Reply to user"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 resize-none"
                      />
                      <div className="flex items-center justify-between mt-2 gap-3">
                        <MediaUploader
                          onUpload={(url) => setReplyMedia((prev) => ({ ...prev, [conv.user_id]: url }))}
                          onRemove={() => setReplyMedia((prev) => ({ ...prev, [conv.user_id]: null }))}
                          currentUrl={replyMedia[conv.user_id]}
                          label="Attach"
                        />
                        <div className="flex items-center gap-3">
                          {sendError[conv.user_id] && (
                            <p className="text-xs text-red-400" role="alert">{sendError[conv.user_id]}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => sendReply(conv.user_id)}
                            disabled={sending === conv.user_id || !(replyText[conv.user_id] ?? '').trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-500 transition disabled:opacity-50 min-h-11"
                          >
                            {sending === conv.user_id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Send className="w-4 h-4" />}
                            {sending === conv.user_id ? 'Sending…' : 'Send'}
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
