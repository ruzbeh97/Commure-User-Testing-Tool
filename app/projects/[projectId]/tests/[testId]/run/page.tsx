import { getTest } from '@/lib/queries/tests';
import { getProject } from '@/lib/queries/projects';
import { notFound } from 'next/navigation';
import { TestRunner } from '@/components/runner/TestRunner';

export default async function RunTestPage({ params }: { params: Promise<{ projectId: string; testId: string }> }) {
  const { projectId, testId } = await params;
  const test = getTest(testId);
  const project = getProject(projectId);
  if (!test || !project) notFound();

  return (
    <TestRunner
      testId={test.id}
      testName={test.name}
      projectId={projectId}
    />
  );
}
