'use client';
import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, User, Video, Clock, MessageSquare } from 'lucide-react';
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
  const duration = session.completed_at ? session.completed_at - session.started_at : null;
  const hasExtras = !!session.recording_url || !!session.notes;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={14} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900 text-sm">{session.tester_name || 'Anonymous'}</span>
            {session.tester_email && <span className="text-xs text-gray-400">{session.tester_email}</span>}
            {showVariant && session.variant_name && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{session.variant_name}</span>
            )}
            <Badge variant={statusBadge(session.status)}>{session.status.replace('_', ' ')}</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Clock size={11} />{formatDate(session.started_at)}</span>
            {duration !== null && <span>{formatDuration(duration)}</span>}
            {completionPct !== null && (
              <span className="font-semibold text-gray-600">{formatPercent(completionPct)} completed</span>
            )}
            {session.recording_url && (
              <span className="flex items-center gap-1 text-indigo-500"><Video size={11} /> Recording</span>
            )}
          </div>
        </div>
      </div>

      {/* Task results — always visible */}
      {taskResults.length > 0 && (
        <div className="px-5 pb-4">
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            {taskResults.map((tr, i) => (
              <div key={tr.task_id} className="flex items-center gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 text-sm text-gray-700 truncate" title={tr.instruction}>{tr.instruction}</span>
                <span className="text-xs text-gray-400 flex-shrink-0 w-14 text-right">{tr.duration_ms ? formatDuration(tr.duration_ms) : '—'}</span>
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

      {/* Expandable: notes + recording */}
      {hasExtras && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 px-5 py-2 border-t border-gray-100 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide' : 'Show'} {[session.notes && 'notes', session.recording_url && 'recording'].filter(Boolean).join(' & ')}
          </button>

          {expanded && (
            <div className="px-5 pb-4 pt-3 space-y-4 border-t border-gray-100">
              {session.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={11} /> Notes
                  </p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{session.notes}</p>
                </div>
              )}
              {session.recording_url && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Video size={11} /> Session Recording
                  </p>
                  <video
                    src={session.recording_url}
                    controls
                    className="w-full rounded-lg border border-gray-200 bg-black"
                    style={{ maxHeight: 420 }}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* No task data yet */}
      {taskResults.length === 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400 italic">No task data recorded for this session.</p>
        </div>
      )}
    </div>
  );
}
