'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Split, MousePointer, Layout, Plus, Trash2 } from 'lucide-react';
import type { TestType } from '@/types';

const TEST_TYPES: { type: TestType; icon: React.ReactNode; label: string; description: string }[] = [
  { type: 'usability', icon: <MousePointer size={22} />, label: 'Usability Test', description: 'Give testers tasks to complete on a prototype and measure success, time, and where they click.' },
  { type: 'ab', icon: <Split size={22} />, label: 'A/B Test', description: 'Compare two or more prototype variants. Testers are randomly assigned and we track their behavior.' },
  { type: 'prototype', icon: <Layout size={22} />, label: 'Prototype Feedback', description: 'Open exploration of a prototype with optional task prompts. Great for early-stage designs.' },
];

export default function NewTestPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [testType, setTestType] = useState<TestType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prototypeUrl, setPrototypeUrl] = useState('');
  const [tasks, setTasks] = useState<{ instruction: string; success_criteria: string }[]>([{ instruction: '', success_criteria: '' }]);
  const [variants, setVariants] = useState([{ name: 'Control', url: '', weight: 0.5 }, { name: 'Variant A', url: '', weight: 0.5 }]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addTask = () => setTasks(prev => [...prev, { instruction: '', success_criteria: '' }]);
  const removeTask = (i: number) => setTasks(prev => prev.filter((_, idx) => idx !== i));
  const updateTask = (i: number, field: 'instruction' | 'success_criteria', val: string) =>
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

  const addVariant = () => setVariants(prev => [...prev, { name: `Variant ${String.fromCharCode(64 + prev.length)}`, url: '', weight: 0.5 }]);
  const removeVariant = (i: number) => setVariants(prev => prev.filter((_, idx) => idx !== i));
  const updateVariant = (i: number, field: 'name' | 'url', val: string) =>
    setVariants(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Test name is required';
    if (testType !== 'ab' && !prototypeUrl.trim()) errs.url = 'Prototype URL is required';
    if (testType === 'ab') {
      variants.forEach((v, i) => { if (!v.url.trim()) errs[`variant_${i}`] = 'URL required'; });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate() || !testType) return;
    setLoading(true);

    const body: Record<string, unknown> = {
      project_id: projectId,
      name: name.trim(),
      type: testType,
      description: description.trim() || undefined,
      prototype_url: testType !== 'ab' ? prototypeUrl.trim() : undefined,
      tasks: tasks.filter(t => t.instruction.trim()).map(t => ({
        instruction: t.instruction.trim(),
        success_criteria: t.success_criteria.trim() || undefined,
      })),
    };

    if (testType === 'ab') {
      body.variants = variants.map(v => ({ name: v.name, url: v.url.trim(), weight: v.weight }));
    }

    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const test = await res.json();
      router.push(`/projects/${projectId}/tests/${test.id}`);
    } else {
      setErrors({ submit: 'Failed to create test' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <FlaskConical size={22} className="text-indigo-600" />
        <span className="font-bold text-gray-900">UX Testing</span>
        <span className="text-gray-300">/</span>
        <Link href={`/projects/${projectId}`} className="text-gray-500 hover:text-gray-700 text-sm">Project</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 text-sm">New Test</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={15} /> Back
        </Link>

        {step === 'type' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Choose test type</h1>
            <p className="text-gray-500 text-sm mb-8">What kind of user test do you want to run?</p>
            <div className="space-y-3">
              {TEST_TYPES.map(t => (
                <button
                  key={t.type}
                  onClick={() => { setTestType(t.type); setStep('config'); }}
                  className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-indigo-300 hover:shadow-md transition-all flex items-start gap-4 group"
                >
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 transition-colors">
                    {t.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{t.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'config' && testType && (
          <>
            <button onClick={() => setStep('type')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
              <ArrowLeft size={15} /> Change type
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Configure test</h1>
            <p className="text-gray-500 text-sm mb-8">{TEST_TYPES.find(t => t.type === testType)?.label}</p>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <h2 className="font-semibold text-gray-800">Basic Info</h2>
                <Input label="Test Name" id="name" placeholder="e.g. Checkout flow usability test" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }} error={errors.name} />
                <Textarea label="Description (optional)" id="desc" placeholder="What's the goal of this test?" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {testType !== 'ab' ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Prototype URL</h2>
                  <Input label="URL" id="url" placeholder="https://www.figma.com/proto/..." value={prototypeUrl} onChange={e => { setPrototypeUrl(e.target.value); setErrors(p => ({ ...p, url: '' })); }} error={errors.url} />
                  <p className="text-xs text-gray-400 mt-2">Figma prototypes, staging URLs, or any hosted prototype.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-800">Variants</h2>
                    <button onClick={addVariant} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Plus size={14} /> Add variant
                    </button>
                  </div>
                  <div className="space-y-4">
                    {variants.map((v, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="flex-1 space-y-2">
                          <input
                            value={v.name}
                            onChange={e => updateVariant(i, 'name', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-400"
                            placeholder="Variant name"
                          />
                          <input
                            value={v.url}
                            onChange={e => { updateVariant(i, 'url', e.target.value); setErrors(p => ({ ...p, [`variant_${i}`]: '' })); }}
                            className={`w-full border rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-indigo-400 ${errors[`variant_${i}`] ? 'border-red-400' : 'border-gray-200'}`}
                            placeholder="https://prototype-url.com"
                          />
                          {errors[`variant_${i}`] && <p className="text-xs text-red-500">{errors[`variant_${i}`]}</p>}
                        </div>
                        {variants.length > 2 && (
                          <button onClick={() => removeVariant(i)} className="text-gray-400 hover:text-red-500 mt-2">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-800">Tasks</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Instructions shown to testers during the session</p>
                  </div>
                  <button onClick={addTask} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <Plus size={14} /> Add task
                  </button>
                </div>
                <div className="space-y-4">
                  {tasks.map((task, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-1">{i + 1}</span>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="e.g. Find and add the blue t-shirt to your cart"
                          rows={2}
                          value={task.instruction}
                          onChange={e => updateTask(i, 'instruction', e.target.value)}
                        />
                        <input
                          placeholder="Success criteria (optional) e.g. Tester reaches cart page"
                          value={task.success_criteria}
                          onChange={e => updateTask(i, 'success_criteria', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:border-indigo-400 placeholder:text-gray-400"
                        />
                      </div>
                      {tasks.length > 1 && (
                        <button onClick={() => removeTask(i)} className="text-gray-400 hover:text-red-500 mt-1">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

              <div className="flex gap-3">
                <Button onClick={submit} disabled={loading} className="flex-1">
                  {loading ? 'Creating…' : 'Create Test'}
                </Button>
                <Link href={`/projects/${projectId}`}>
                  <Button variant="secondary">Cancel</Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
