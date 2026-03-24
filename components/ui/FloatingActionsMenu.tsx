'use client';

// components/ui/FloatingActionsMenu.tsx
// Speed-dial FAB that consolidates Help (RAG chat) + Feedback into one corner button.
// Replaces the standalone feedback bubble in dashboard/layout.tsx and adds Help to academy pages.
// Opens upward: main button (LifeBuoy) → Help (HelpCircle) → Feedback (MessageCircle)

import { useState } from 'react';
import { LifeBuoy, X, HelpCircle, MessageCircle } from 'lucide-react';
import FeedbackModal from '@/components/FeedbackModal';
import HelpDrawer from '@/components/ui/HelpDrawer';

interface Props {
  userRole?: string;
  isAdmin?: boolean;
}

export default function FloatingActionsMenu({ userRole, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  function openHelp() {
    setOpen(false);
    setHelpOpen(true);
  }

  function openFeedback() {
    setOpen(false);
    setFeedbackOpen(true);
  }

  return (
    <>
      {/* Speed-dial stack */}
      <div className="fixed bottom-22 lg:bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
        {/* Help action — admin only until help articles are fully seeded */}
        {isAdmin && (
          <div
            className={`flex items-center gap-2.5 transition-all duration-200 ${
              open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="bg-white text-slate-800 text-xs font-medium px-2.5 py-1 rounded-full shadow border border-slate-200">
              Help
            </span>
            <button
              onClick={openHelp}
              title="Open help chat"
              className="bg-slate-100 text-white rounded-full p-3 shadow-lg hover:bg-slate-100 border border-slate-200 transition-colors"
              aria-label="Open help chat"
            >
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </button>
          </div>
        )}

        {/* Feedback action */}
        <div
          className={`flex items-center gap-2.5 transition-all duration-200 delay-75 ${
            open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4'
          }`}
        >
          <span className="bg-white text-slate-800 text-xs font-medium px-2.5 py-1 rounded-full shadow border border-slate-200">
            Feedback
          </span>
          <button
            onClick={openFeedback}
            title="Share feedback"
            className="bg-slate-100 text-white rounded-full p-3 shadow-lg hover:bg-slate-100 border border-slate-200 transition-colors"
            aria-label="Share feedback"
          >
            <MessageCircle className="w-5 h-5 text-amber-400" />
          </button>
        </div>

        {/* Main toggle button */}
        <button
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Close menu' : 'Help & Feedback'}
          className="bg-amber-600 text-white rounded-full p-3.5 shadow-lg hover:bg-amber-500 transition-colors pointer-events-auto"
          aria-label={open ? 'Close menu' : 'Help & Feedback'}
        >
          {open
            ? <X className="w-5 h-5" />
            : <LifeBuoy className="w-5 h-5" />
          }
        </button>
      </div>

      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} userRole={userRole} />
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
