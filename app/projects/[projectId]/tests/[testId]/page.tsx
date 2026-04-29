import { getTest } from '@/lib/queries/tests';
import { getProject } from '@/lib/queries/projects';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { FlaskConical, ArrowLeft, Play, BarChart2, Link2, ExternalLink } from 'lucide-react';
import { Badge, statusBadge, typeBadge } from '@/components/ui/Badge';
import { TestActions } from '@/components/tests/TestActions';
import { CopyButton } from '@/components/ui/CopyButton';
import type { TestType } from '@/types';

export const dynamic = 'force-dynamic';

const typeLabel: Record<TestType, string> = { ab: 'A/B Test', usability: 'Usability', prototype: 'Prototype' };

export default async function TestDetailPage({ params }: { params: Promise<{ projectId: string; testId: string }> }) {
  const { projectId, testId } = await params;
  const [project, test, hdrs] = await Promise.all([getProject(projectId), getTest(testId), headers()]);
  if (!project || !test) notFound();

  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const runUrl = `${proto}://${host}/projects/${projectId}/tests/${testId}/run`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <FlaskConical size={22} className="text-indigo-600" />
        <span className="font-bold text-gray-900">UX Testing</span>
        <span className="text-gray-300">/</span>
        <Link href="/projects" className="text-gray-500 hover:text-gray-700 text-sm">Projects</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/projects/${projectId}`} className="text-gray-500 hover:text-gray-700 text-sm">{project.name}</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 text-sm font-medium">{test.name}</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={15} /> Back to project
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={typeBadge(test.type)}>{typeLabel[test.type]}</Badge>
              <Badge variant={statusBadge(test.status)}>{test.status}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{test.name}</h1>
            {test.description && <p className="text-gray-500 text-sm mt-1">{test.description}</p>}
            <p className="text-xs text-gray-400 mt-1">Created {formatDate(test.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/projects/${projectId}/tests/${test.id}/results`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors"
            >
              <BarChart2 size={14} /> Results
            </Link>
            <Link
              href={`/projects/${projectId}/tests/${test.id}/run`}
              className="inline-flex items-center gap-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg transition-colors"
            >
              <Play size={14} /> Run Test
            </Link>
          </div>
        </div>

        {/* Share link */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Link2 size={18} className="text-indigo-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-800 mb-0.5">Tester Link — share this with participants</p>
            <p className="text-xs text-indigo-600 font-mono truncate">{runUrl}</p>
          </div>
          <CopyButton text={runUrl} />
        </div>

        <div className="space-y-4">
          {test.type !== 'ab' && test.prototype_url && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Prototype URL</h2>
              <a href={test.prototype_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
                <ExternalLink size={14} />
                {test.prototype_url}
              </a>
            </div>
          )}

          {test.type === 'ab' && test.variants && test.variants.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Variants</h2>
              <div className="space-y-2">
                {test.variants.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-800 w-24 flex-shrink-0">{v.name}</span>
                    <a href={v.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 flex-1 truncate">
                      <ExternalLink size={12} />
                      {v.url}
                    </a>
                    <span className="text-xs text-gray-400">{Math.round(v.weight * 100)}% traffic</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {test.tasks && test.tasks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Tasks ({test.tasks.length})</h2>
              <div className="space-y-3">
                {test.tasks.map((task, i) => (
                  <div key={task.id} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div>
                      <p className="text-sm text-gray-800">{task.instruction}</p>
                      {task.success_criteria && <p className="text-xs text-gray-500 mt-0.5">{task.success_criteria}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <TestActions testId={test.id} projectId={projectId} currentStatus={test.status} />
        </div>
      </div>
    </div>
  );
}
