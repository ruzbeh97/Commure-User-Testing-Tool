import { getResults } from '@/lib/queries/sessions';
import { getProject } from '@/lib/queries/projects';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatDuration } from '@/lib/utils';
import { FlaskConical, ArrowLeft, Play, User } from 'lucide-react';
import { Badge, statusBadge, typeBadge } from '@/components/ui/Badge';
import { HeatmapCanvas } from '@/components/results/HeatmapCanvas';
import { AnalyticsPanel } from '@/components/results/AnalyticsPanel';
import type { TestType, Session } from '@/types';

export const dynamic = 'force-dynamic';

const typeLabel: Record<TestType, string> = { ab: 'A/B Test', usability: 'Usability', prototype: 'Prototype' };

export default async function ResultsPage({ params }: { params: Promise<{ projectId: string; testId: string }> }) {
  const { projectId, testId } = await params;
  const [project, results] = await Promise.all([getProject(projectId), getResults(testId)]);
  if (!project || !results?.test) notFound();

  const { test, sessions, taskStats, clickEvents, variantComparison } = results;

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
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Analytics</h2>
              <AnalyticsPanel
                taskStats={taskStats}
                variantComparison={variantComparison}
                sessionCount={sessions.length}
              />
            </section>

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

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Sessions ({sessions.length})</h2>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Tester</th>
                      {test.type === 'ab' && <th className="text-left px-5 py-3 font-semibold text-gray-600">Variant</th>}
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Duration</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sessions.map((s: Session & { variant_name?: string }) => (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User size={13} className="text-indigo-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{s.tester_name || 'Anonymous'}</p>
                              {s.tester_email && <p className="text-xs text-gray-400">{s.tester_email}</p>}
                            </div>
                          </div>
                        </td>
                        {test.type === 'ab' && (
                          <td className="px-5 py-3 text-gray-600">{s.variant_name ?? '—'}</td>
                        )}
                        <td className="px-5 py-3">
                          <Badge variant={statusBadge(s.status)}>{s.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {s.completed_at ? formatDuration(s.completed_at - s.started_at) : '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(s.started_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
