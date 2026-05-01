import { getResults } from '@/lib/queries/sessions';
import { getProject } from '@/lib/queries/projects';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatPercent, formatDuration } from '@/lib/utils';
import { FlaskConical, ArrowLeft, Play, User, TrendingDown, Clock, CheckCircle } from 'lucide-react';
import { Badge, statusBadge, typeBadge } from '@/components/ui/Badge';
import { HeatmapCanvas } from '@/components/results/HeatmapCanvas';
import { AnalyticsPanel } from '@/components/results/AnalyticsPanel';
import { SessionCard } from '@/components/results/SessionCard';
import type { TestType, SessionTaskResult } from '@/types';

export const dynamic = 'force-dynamic';

const typeLabel: Record<TestType, string> = { ab: 'A/B Test', usability: 'Usability', prototype: 'Prototype' };

export default async function ResultsPage({ params }: { params: Promise<{ projectId: string; testId: string }> }) {
  const { projectId, testId } = await params;
  const [project, results] = await Promise.all([getProject(projectId), getResults(testId)]);
  if (!project || !results?.test) notFound();

  const { test, sessions, taskStats, clickEvents, variantComparison, sessionTaskResults = [] } = results;

  // Group per-session task results
  const taskResultsBySession = sessionTaskResults.reduce<Record<string, SessionTaskResult[]>>((acc, tr) => {
    (acc[tr.session_id] ??= []).push(tr);
    return acc;
  }, {});

  // Test-level insights
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const avgDuration = completedSessions.length
    ? completedSessions.reduce((s, sess) => s + ((sess.completed_at ?? sess.started_at) - sess.started_at), 0) / completedSessions.length
    : null;
  const hardestTask = taskStats.length
    ? taskStats.reduce((a, b) => (a.completion_rate ?? 100) < (b.completion_rate ?? 100) ? a : b)
    : null;
  const overallCompletion = taskStats.length
    ? taskStats.reduce((s, t) => s + (t.completion_rate ?? 0), 0) / taskStats.length
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <FlaskConical size={22} className="text-indigo-600" />
        <span className="font-bold text-gray-900">Commure UX Testing Tool</span>
        <span className="text-gray-300">/</span>
        <Link href="/projects" className="text-gray-500 hover:text-gray-700 text-sm">Projects</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/projects/${projectId}`} className="text-gray-500 hover:text-gray-700 text-sm">{project.name}</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/projects/${projectId}/tests/${test.id}`} className="text-gray-500 hover:text-gray-700 text-sm">{test.name}</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 text-sm font-medium">Results</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link href={`/projects/${projectId}/tests/${test.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
              <ArrowLeft size={15} /> Back to test
            </Link>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={typeBadge(test.type)}>{typeLabel[test.type as TestType]}</Badge>
              <Badge variant={statusBadge(test.status)}>{test.status}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{test.name} — Results</h1>
          </div>
          <Link
            href={`/projects/${projectId}/tests/${test.id}/run`}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Play size={14} /> Run Test
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No sessions yet</h2>
            <p className="text-gray-500 text-sm mb-6">Share the test link with testers to start collecting data.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Test-level summary */}
            {completedSessions.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SummaryCard
                    icon={<CheckCircle size={18} className="text-emerald-500" />}
                    label="Overall completion rate"
                    value={overallCompletion !== null ? formatPercent(overallCompletion) : '—'}
                    sub={`across ${completedSessions.length} completed session${completedSessions.length !== 1 ? 's' : ''}`}
                  />
                  <SummaryCard
                    icon={<Clock size={18} className="text-indigo-500" />}
                    label="Avg session duration"
                    value={avgDuration !== null ? formatDuration(avgDuration) : '—'}
                    sub="for completed sessions"
                  />
                  {hardestTask && (
                    <SummaryCard
                      icon={<TrendingDown size={18} className="text-amber-500" />}
                      label="Most challenging task"
                      value={formatPercent(hardestTask.completion_rate ?? 0) + ' completion'}
                      sub={hardestTask.instruction}
                      subTruncate
                    />
                  )}
                </div>
              </section>
            )}

            {/* Per-task analytics */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Analytics</h2>
              <AnalyticsPanel
                taskStats={taskStats}
                variantComparison={variantComparison}
                sessionCount={sessions.length}
              />
            </section>

            {/* Heatmap */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Click Heatmap</h2>
                <span className="text-sm text-gray-500">{clickEvents.length} clicks recorded</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-3">Coordinates normalized to tester viewport. Hot zones = red, cold = blue.</p>
                <HeatmapCanvas events={clickEvents} type="click" backgroundUrl={test.prototype_url ?? undefined} />
              </div>
            </section>

            {/* Session cards */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Sessions ({sessions.length})</h2>
              <div className="space-y-3">
                {sessions.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    taskResults={taskResultsBySession[s.id] ?? []}
                    showVariant={test.type === 'ab'}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, subTruncate }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subTruncate?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className={`text-xs text-gray-400 ${subTruncate ? 'truncate' : ''}`} title={subTruncate ? sub : undefined}>{sub}</div>
    </div>
  );
}
