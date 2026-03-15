'use client';

// app/admin/academy/courses/page.tsx
// Admin: manage all courses — unpublish, delete, contact teacher.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, Eye, EyeOff, Trash2, Mail, ExternalLink, Loader2, BookOpen,
} from 'lucide-react';

interface AdminCourse {
  id: string;
  title: string;
  is_published: boolean;
  price: number;
  price_type: string;
  category: string | null;
  created_at: string;
  teacher_name: string;
  teacher_email: string;
  enrollment_count: number;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/academy/courses')
      .then((r) => r.json())
      .then((d) => { setCourses(d.courses || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function togglePublish(course: AdminCourse) {
    setActionId(course.id);
    try {
      const r = await fetch(`/api/academy/courses/${course.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !course.is_published }),
      });
      if (r.ok) {
        setCourses((prev) =>
          prev.map((c) => c.id === course.id ? { ...c, is_published: !c.is_published } : c)
        );
      }
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(courseId: string, title: string) {
    if (!confirm(`Delete "${title}" and all its lessons, enrollments, and student data? This cannot be undone.`)) return;
    setActionId(courseId);
    try {
      const r = await fetch(`/api/academy/courses/${courseId}`, { method: 'DELETE' });
      if (r.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
      }
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/academy" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm mb-6 transition min-h-11">
        <ChevronLeft className="w-4 h-4" /> Academy Settings
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <BookOpen className="w-6 h-6 text-amber-600" />
        <h1 className="text-2xl font-bold text-slate-900">Course Management</h1>
      </div>
      <p className="text-slate-500 text-sm mb-8">
        {courses.length} course{courses.length !== 1 ? 's' : ''} total. Unpublish or delete courses that violate guidelines, and contact teachers directly.
      </p>

      {courses.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-xl p-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">No courses yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-slate-200 rounded-xl px-5 py-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-slate-900 font-medium truncate">{course.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      course.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                    {course.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">
                        {course.category}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm mt-1">
                    by <span className="text-slate-700">{course.teacher_name}</span>
                    {course.teacher_email && (
                      <span className="text-slate-500"> ({course.teacher_email})</span>
                    )}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {course.price_type === 'free'
                      ? 'Free'
                      : `$${course.price} · ${course.price_type === 'one_time' ? 'one-time' : 'subscription'}`}
                    {' · '}
                    {course.enrollment_count} enrolled
                    {' · '}
                    {new Date(course.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Publish / Unpublish */}
                  <button
                    type="button"
                    onClick={() => togglePublish(course)}
                    disabled={actionId === course.id}
                    title={course.is_published ? 'Unpublish' : 'Publish'}
                    aria-label={course.is_published ? 'Unpublish course' : 'Publish course'}
                    className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg transition disabled:opacity-50 ${
                      course.is_published
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {actionId === course.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : course.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />
                    }
                  </button>

                  {/* Preview */}
                  <Link
                    href={`/academy/${course.id}`}
                    target="_blank"
                    title="Preview course"
                    aria-label="Preview course"
                    className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  {/* Contact Teacher */}
                  <Link
                    href={`/admin/messages?email=${encodeURIComponent(course.teacher_email)}&subject=${encodeURIComponent(`Re: ${course.title}`)}`}
                    title="Contact teacher"
                    aria-label="Contact teacher"
                    className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </Link>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(course.id, course.title)}
                    disabled={actionId === course.id}
                    title="Delete course"
                    aria-label="Delete course"
                    className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-50"
                  >
                    {actionId === course.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
