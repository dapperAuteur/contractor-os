'use client';

// app/academy/my-courses/messages/page.tsx
// Student course DM inbox: conversation list + message thread.

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  MessageCircle, ChevronLeft, Send, Loader2,
} from 'lucide-react';
import { offlineFetch } from '@/lib/offline/offline-fetch';

interface Conversation {
  course_id: string;
  course_title: string;
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  course_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  media_url: string | null;
  is_read: boolean;
  created_at: string;
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const initialCourse = searchParams.get('course');
  const initialPartner = searchParams.get('partner');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<{ courseId: string; partnerId: string; partnerName: string } | null>(
    initialCourse && initialPartner
      ? { courseId: initialCourse, partnerId: initialPartner, partnerName: 'Teacher' }
      : null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    offlineFetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUserId(d?.id ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    offlineFetch('/api/academy/messages')
      .then((r) => r.json())
      .then((d) => {
        setConversations(Array.isArray(d) ? d : []);
        if (initialCourse && initialPartner) {
          const conv = (d as Conversation[]).find(
            (c) => c.course_id === initialCourse && c.partner_id === initialPartner,
          );
          if (conv) {
            setActiveConv({ courseId: initialCourse, partnerId: initialPartner, partnerName: conv.partner_name });
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    setLoadingMessages(true);
    offlineFetch(`/api/academy/courses/${activeConv.courseId}/messages?partner_id=${activeConv.partnerId}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(Array.isArray(d) ? d : []);
        setLoadingMessages(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .catch(() => setLoadingMessages(false));
  }, [activeConv]);

  // Auto-refresh messages every 30 seconds
  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(() => {
      offlineFetch(`/api/academy/courses/${activeConv.courseId}/messages?partner_id=${activeConv.partnerId}`)
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setMessages(d); })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [activeConv]);

  async function handleSend() {
    if (!newMessage.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      const r = await offlineFetch(`/api/academy/courses/${activeConv.courseId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: activeConv.partnerId, body: newMessage.trim() }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage('');
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch { /* ignore */ }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label="Loading messages">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6">
        <Link href="/academy/my-courses" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm mb-4 transition min-h-11">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" /> My Courses
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MessageCircle className="w-7 h-7 text-amber-600" aria-hidden="true" /> Messages
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-[60vh]">
        {/* Conversation list — hide on mobile when thread is open */}
        <nav
          className={`w-full lg:w-80 shrink-0 ${activeConv ? 'hidden lg:block' : ''}`}
          aria-label="Conversations"
        >
          {conversations.length === 0 ? (
            <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-xl">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" aria-hidden="true" />
              <p className="text-slate-500 text-sm">No messages yet.</p>
              <p className="text-slate-400 text-xs mt-1">Start a conversation from a course page.</p>
            </div>
          ) : (
            <div className="space-y-1" role="list">
              {conversations.map((conv) => {
                const isActive = activeConv?.courseId === conv.course_id && activeConv?.partnerId === conv.partner_id;
                return (
                  <button
                    key={`${conv.course_id}:${conv.partner_id}`}
                    type="button"
                    onClick={() => setActiveConv({ courseId: conv.course_id, partnerId: conv.partner_id, partnerName: conv.partner_name })}
                    aria-current={isActive ? 'true' : undefined}
                    className={`w-full text-left p-3 rounded-xl transition min-h-11 ${
                      isActive ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {conv.partner_avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={conv.partner_avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                          {conv.partner_name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">{conv.partner_name}</p>
                          {conv.unread_count > 0 && (
                            <span className="bg-amber-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0" aria-label={`${conv.unread_count} unread`}>
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{conv.course_title}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{conv.last_message}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Thread */}
        <div className={`flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden ${!activeConv ? 'hidden lg:flex' : ''}`}>
          {activeConv ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveConv(null)}
                  className="lg:hidden flex items-center justify-center min-h-11 min-w-11 p-1 text-slate-500 hover:text-slate-900 transition rounded-lg"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                </button>
                <p className="font-medium text-slate-900 text-sm">{activeConv.partnerName}</p>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
                style={{ maxHeight: 'calc(60vh - 8rem)' }}
                role="log"
                aria-label="Message thread"
                aria-live="polite"
              >
                {loadingMessages ? (
                  <div className="flex justify-center py-8" role="status" aria-label="Loading messages">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-600" aria-hidden="true" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? 'bg-amber-600 text-white rounded-br-md'
                            : 'bg-slate-100 text-slate-800 rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.body}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-amber-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="border-t border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="student-dm-input" className="sr-only">Type a message</label>
                  <input
                    id="student-dm-input"
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 min-h-11"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    aria-label="Send message"
                    className="flex items-center justify-center min-h-11 min-w-11 p-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-500 transition disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentMessagesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20" role="status"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>}>
      <MessagesContent />
    </Suspense>
  );
}
