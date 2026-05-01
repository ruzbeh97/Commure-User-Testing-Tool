'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';

export function ProjectActions({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const deleteProject = async () => {
    if (!confirm('Delete this project and all its tests and data? This cannot be undone.')) return;
    setLoading(true);
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    router.push('/projects');
  };

  return (
    <Button variant="danger" size="sm" disabled={loading} onClick={deleteProject}>
      <Trash2 size={14} /> Delete Project
    </Button>
  );
}
