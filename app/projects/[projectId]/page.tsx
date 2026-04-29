import { getProject } from '@/lib/queries/projects';
import { listTests } from '@/lib/queries/tests';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Plus, ArrowLeft, FlaskConical, BarChart2, ChevronRight, Play } from 'lucide-react';
import { Badge, statusBadge, typeBadge } from '@/components/ui/Badge';
import type { TestType } from '@/types';

export const dynamic = 'force-dynamic';

const typeLabel: Record<TestType, string> = {
  ab: 'A/B Test',
  usability: 'Usability',
  prototype: 'Prototype',
};

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProject(projectId);
  if (!project) notFound();
  const tests = listTests(projectId);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <FlaskConical size={22} className="text-indigo-600" />
        <span className="font-bold text-gray-900">UX Testing</span>
        <span className="text-gray-300">/</span>
        <Link href="/projects" className="text-gray-500 hover:text-gray-700 text-sm">Projects</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 text-sm font-medium">{project.name}</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft size={15} /> All projects
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
              <p className="text-xs text-gray-400 mt-1">Created {formatDate(project.created_at)}</p>
            </div>
            <Link
              href={`/projects/${projectId}/tests/new`}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus size={16} /> New Test
            </Link>
          </div>
        </div>

        {tests.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FlaskConical size={24} className="text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No tests yet</h2>
            <p className="text-gray-500 text-sm mb-6">Create your first test to start collecting user feedback.</p>
            <Link
              href={`/projects/${projectId}/tests/new`}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={16} /> Create Test
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map(test => (
              <div key={test.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:border-indigo-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={typeBadge(test.type)}>{typeLabel[test.type]}</Badge>
                    <Badge variant={statusBadge(test.status)}>{test.status}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900">{test.name}</h3>
                  {test.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{test.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {test.session_count ?? 0} session{test.session_count !== 1 ? 's' : ''} · Updated {formatDate(test.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/projects/${projectId}/tests/${test.id}/results`}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <BarChart2 size={14} /> Results
                  </Link>
                  <Link
                    href={`/projects/${projectId}/tests/${test.id}/run`}
                    className="inline-flex items-center gap-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Play size={14} /> Run Test
                  </Link>
                  <Link
                    href={`/projects/${projectId}/tests/${test.id}`}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
