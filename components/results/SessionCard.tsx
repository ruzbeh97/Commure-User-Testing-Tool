'use client';
import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronRight, User, Video, Clock } from 'lucide-react';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { formatDate, formatDuration, formatPercent } from '@/lib/utils';
import type { Session, SessionTaskResult } from '@/types';

export function SessionCard({
  session,
  taskResults,
  showVariant,
}: {
  session: Session & { variant_name?: string };
  taskResults: SessionTaskResult[];
  showVariant: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const completed = taskResults.filter(t => t.completed).length;
  const total = taskResults.length;
  const completionPct = total > 0 ? (completed / total) * 100 : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Summary row — always visible */}
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{session.tester_name || 'Anonymous'}</p>
          {session.tester_email && <p className="text-xs text-gray-400">{session.tester_email}</p>}
        </div>
        {showVariant && (
          <span className="text-xs text-gray-500 hidden sm:block">{session.variant_name ?? '—'}</span>
        )}
        <Badge variant={statusBadge(session.status)} className="flex-shrink-0">
          {session.status.replace('_', ' ')}
        </Badge>
        {completionPct !== null && (
          <span className="text-xs font-semibold text-gray-700 hidden sm:block w-12 text-right">
            {formatPercent(completionPct)}
          </span>
        )}
        <span className="text-xs text-gray-400 hidden sm:block w-16 text-right">
          {session.completed_at ? formatDuration(session.completed_at - session.started_at) : '—'}
        </span>
        <span className="text-xs text-gray-300 hidden md:block w-20 text-right">
          {formatDate(session.started_at)}
        </span>
        {session.recording_url && (
          <span title="Recording available"><Video size={14} className="text-indigo-400 flex-shrink-0" /></span>
        )}
        {expanded ? (
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Task breakdown */}
          {taskResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Task Results</p>
              <div className="space-y-2">
                {taskResults.map((tr, i) => (
                  <div key={tr.task_id} className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="flex-1 text-sm text-gray-700 truncate">{tr.instruction}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{tr.duration_ms ? formatDuration(tr.duration_ms) : '—'}</span>
                    {tr.completed ? (
                      <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{session.notes}</p>
            </div>
          )}

          {/* Recording */}
          {session.recording_url && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Session Recording</p>
              <video
                src={session.recording_url}
                controls
                className="w-full rounded-lg border border-gray-200 bg-black"
                style={{ maxHeight: 400 }}
              />
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1"><Clock size={11} /> Started {formatDate(session.started_at)}</span>
            {session.viewport_w && <span>{session.viewport_w}×{session.viewport_h}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
