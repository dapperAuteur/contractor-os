'use client';

// components/academy/SubmissionMessageThread.tsx
// Reusable threaded chat for assignment submissions (student ↔ teacher).
// Used on both the student assignment page and the teacher grading UI.

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Message {
  id: string;
  body: string;
  is_teacher: boolean;
  created_at: string;
  profiles?: { display_name: string | null; username: string | null } | null;
}

interface SubmissionMessageThreadProps {
  assignmentId: string;
  submissionId: string;
  /** 'student' shows teacher messages on left, student on right. 'teacher' reverses. */
  perspective: 'student' | 'teacher';
  /** Placeholder text for the message input */
  placeholder?: string;
}

export default function SubmissionMessageThread({
  assignmentId,
  submissionId,
  perspective,
  placeholder,
}: SubmissionMessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const res = await offlineFetch(
      `/api/academy/assignments/${assignmentId}/submissions/${submissionId}/messages`
    );
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? data ?? []);
    }
    setLoading(false);
  }, [assignmentId, submissionId]);

  useEffect(() => {
    fetchMessages();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMessages, 30_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const body = newMessage.trim();
    if (!body) return;

    setSending(true);
    setNewMessage('');

    const res = await offlineFetch(
      `/api/academy/assignments/${assignmentId}/submissions/${submissionId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }
    );

    if (res.ok) {
      await fetchMessages();
    } else {
      setNewMessage(body); // Restore on failure
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine which side each message appears on
  const isOwnMessage = (msg: Message) =>
    perspective === 'teacher' ? msg.is_teacher : !msg.is_teacher;

  const defaultPlaceholder =
    perspective === 'teacher' ? 'Reply to student…' : 'Message your teacher…';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 text-sm">
        <MessageCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />
        Feedback Thread
      </h3>

      {/* Message list */}
      {loading ? (
        <div className="flex items-center justify-center py-8" role="status" aria-label="Loading messages">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" aria-hidden="true" />
        </div>
      ) : messages.length === 0 ? (
        <p className="text-slate-500 text-sm mb-4">
          No messages yet.{' '}
          {perspective === 'student'
            ? 'Your teacher will respond here once they review your submission.'
            : 'Send a message to give feedback on this submission.'}
        </p>
      ) : (
        <div
          className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1"
          role="log"
          aria-label="Message thread"
          aria-live="polite"
        >
          {messages.map((msg) => {
            const own = isOwnMessage(msg);
            const senderName = msg.is_teacher
              ? (msg.profiles?.display_name ?? msg.profiles?.username ?? 'Teacher')
              : (msg.profiles?.display_name ?? msg.profiles?.username ?? 'Student');

            return (
              <div key={msg.id} className={`flex ${own ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[75%] sm:max-w-sm ${own ? 'ml-auto' : ''}`}>
                  <div
                    className={`inline-block px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                      own
                        ? 'bg-amber-600 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {msg.body}
                  </div>
                  <p className={`text-slate-400 text-xs mt-1 ${own ? 'text-right' : ''}`}>
                    {own ? 'You' : senderName}{' · '}
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Message input */}
      <div className="flex gap-2">
        <label htmlFor={`msg-input-${submissionId}`} className="sr-only">
          {placeholder || defaultPlaceholder}
        </label>
        <input
          id={`msg-input-${submissionId}`}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          aria-label="Send message"
          className="flex items-center justify-center min-h-11 min-w-11 p-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-500 transition disabled:opacity-50"
        >
          {sending
            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            : <Send className="w-4 h-4" aria-hidden="true" />
          }
        </button>
      </div>
    </div>
  );
}
