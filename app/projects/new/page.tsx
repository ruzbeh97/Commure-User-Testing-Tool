'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required'); return; }
    setLoading(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    });
    if (res.ok) {
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } else {
      setError('Failed to create project');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <FlaskConical size={22} className="text-indigo-600" />
        <span className="font-bold text-gray-900">UX Testing</span>
        <span className="text-gray-300">/</span>
        <Link href="/projects" className="text-gray-500 hover:text-gray-700 text-sm">Projects</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 text-sm">New Project</span>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={15} /> Back to projects
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">New Project</h1>
        <p className="text-gray-500 text-sm mb-8">Projects group related tests together</p>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <Input
            label="Project Name"
            id="name"
            placeholder="e.g. Mobile App Redesign"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            error={error}
            autoFocus
          />
          <Textarea
            label="Description (optional)"
            id="description"
            placeholder="What are you testing and why?"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Project'}
            </Button>
            <Link href="/projects">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
