'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { TestStatus } from '@/types';
import { CheckCircle, Play, Archive, Trash2 } from 'lucide-react';

export function TestActions({ testId, projectId, currentStatus }: {
  testId: string;
  projectId: string;
  currentStatus: TestStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const updateStatus = async (status: TestStatus) => {
    setLoading(status);
    await fetch(`/api/tests/${testId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(null);
  };

  const deleteTest = async () => {
    if (!confirm('Delete this test and all its data?')) return;
    setLoading('delete');
    await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Actions</h2>
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'draft' && (
          <Button variant="outline" size="sm" disabled={!!loading} onClick={() => updateStatus('active')}>
            <Play size={14} /> Activate
          </Button>
        )}
        {currentStatus === 'active' && (
          <Button variant="secondary" size="sm" disabled={!!loading} onClick={() => updateStatus('closed')}>
            <Archive size={14} /> Close test
          </Button>
        )}
        {currentStatus === 'closed' && (
          <Button variant="outline" size="sm" disabled={!!loading} onClick={() => updateStatus('active')}>
            <CheckCircle size={14} /> Reopen
          </Button>
        )}
        <Button variant="danger" size="sm" disabled={!!loading} onClick={deleteTest}>
          <Trash2 size={14} /> Delete
        </Button>
      </div>
    </div>
  );
}
