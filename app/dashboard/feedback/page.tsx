'use client';

// app/dashboard/feedback/page.tsx
// User's unified feedback conversation — all submissions + admin replies
// shown as one chat thread with real-time push via Supabase.

import { useEffect, useState, useRef } from 'react';
import { Bug, Lightbulb, MessageSquare, Send, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { offlineFetch } from '@/lib/offline/offline-fetch';
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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  bug: Bug, feature: Lightbulb, general: MessageSquare,
};
const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug Report', feature: 'Feature Request', general: 'General',
};

function fmtTime(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function UserBubble({ msg }: { msg: ConversationMessage }) {
  const CatIcon = msg.category ? (CATEGORY_ICONS[msg.category] ?? MessageSquare) : MessageSquare;
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] bg-amber-50 border border-amber-200 rounded-2xl rounded-tr-sm px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <CatIcon className="w-3 h-3 text-amber-600" aria-hidden="true" />
          <span className="text-xs font-semibold text-amber-700">
            {CATEGORY_LABELS[msg.category ?? ''] ?? 'Feedback'}
          </span>
        </div>
        <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.body}</p>
        {msg.media_url && <ImageLightbox url={msg.media_url} />}
        <p className="text-xs text-slate-400 mt-1.5 text-right">{fmtTime(msg.created_at)}</p>
      </div>
    </div>
  );
}

function AdminBubble({ msg }: { msg: ConversationMessage }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[78%] bg-purple-50 border border-purple-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <p className="text-xs font-semibold text-purple-600 mb-1.5">Work.WitUS Team</p>
        <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.body}</p>
        {msg.media_url && <ImageLightbox url={msg.media_url} />}
        <p className="text-xs text-slate-400 mt-1.5 text-right">{fmtTime(msg.created_at)}</p>
      </div>
    </div>
  );
}

export default function FeedbackConversationPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [feedbackIds, setFeedbackIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyMedia, setReplyMedia] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    offlineFetch('/api/feedback/conversation')
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setFeedbackIds(d.feedback_ids ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime: watch for new admin replies to any of the user's feedback IDs
  useEffect(() => {
    if (feedbackIds.length === 0) return;
    const supabase = createClient();
    const channel = supabase
      .channel('user-feedback-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_replies' }, (payload) => {
        const r = payload.new as {
          id: string; feedback_id: string; is_admin: boolean;
          body: string; media_url: string | null; created_at: string;
        };
        if (!feedbackIds.includes(r.feedback_id)) return;
        setMessages((prev) => [
          ...prev,
          {
            id: r.id, type: 'reply', is_admin: r.is_admin,
            body: r.body, media_url: r.media_url,
            created_at: r.created_at, feedback_id: r.feedback_id,
          },
        ]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [feedbackIds]);

  async function sendReply() {
    const body = replyText.trim();
    if (!body) return;
    setSending(true);
    setSendError('');
    // Reply to the latest feedback submission
    const latestFeedbackId = feedbackIds[feedbackIds.length - 1];
    if (!latestFeedbackId) { setSendError('No feedback thread found.'); setSending(false); return; }
    try {
      const res = await offlineFetch(`/api/feedback/${latestFeedbackId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, media_url: replyMedia }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
      // Optimistic update — realtime will also fire but we deduplicate by id
      const newMsg: ConversationMessage = {
        id: `opt-${Date.now()}`, type: 'reply', is_admin: false,
        body, media_url: replyMedia, created_at: new Date().toISOString(),
        feedback_id: latestFeedbackId,
      };
      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      setReplyMedia(null);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <MessageSquare className="w-6 h-6 text-amber-600" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-slate-900">My Feedback</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        Your conversation with the Work.WitUS team. New messages appear automatically.
      </p>

      {messages.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="mb-2">No messages yet.</p>
          <p className="text-sm text-slate-500">
            Use the <span className="font-medium text-amber-600">feedback button</span> in the bottom-right corner to start.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Chat thread */}
          <div className="px-4 py-5 space-y-4 max-h-150 overflow-y-auto">
            {messages.map((msg) =>
              msg.is_admin
                ? <AdminBubble key={msg.id} msg={msg} />
                : <UserBubble key={msg.id} msg={msg} />
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply form */}
          {feedbackIds.length > 0 && (
            <div className="px-4 pb-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Add a Reply</p>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }}
                rows={3}
                placeholder="Add more details or respond to the team… (⌘↵ to send)"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between mt-2 gap-3">
                <MediaUploader
                  onUpload={(url) => setReplyMedia(url)}
                  onRemove={() => setReplyMedia(null)}
                  currentUrl={replyMedia}
                  label="Attach"
                />
                <div className="flex items-center gap-3">
                  {sendError && <p className="text-xs text-red-500" role="alert">{sendError}</p>}
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-500 transition disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
