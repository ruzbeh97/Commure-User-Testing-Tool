import { listProjects } from '@/lib/queries/projects';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Plus, FlaskConical, FolderOpen } from 'lucide-react';
import { Badge, statusBadge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={22} className="text-indigo-600" />
          <span className="font-bold text-gray-900 text-lg">UX Testing</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 text-sm mt-1">Organize your user tests by product or initiative</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} /> New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <FolderOpen size={18} className="text-indigo-600" />
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(p.updated_at)}</span>
                </div>
                <h2 className="font-semibold text-gray-900 mb-1">{p.name}</h2>
                {p.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
                <p className="text-xs text-gray-400">{p.test_count ?? 0} test{p.test_count !== 1 ? 's' : ''}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FolderOpen size={28} className="text-indigo-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">No projects yet</h2>
      <p className="text-gray-500 text-sm mb-6">Create your first project to start running user tests.</p>
      <Link
        href="/projects/new"
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        <Plus size={16} /> Create Project
      </Link>
    </div>
  );
}
