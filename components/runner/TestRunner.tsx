'use client';
import { useState, useEffect, useRef } from 'react';
import { useTracker } from '@/hooks/useTracker';
import { useRecording } from '@/hooks/useRecording';
import { sendNotification } from '@/hooks/useNotification';
import type { Task, SessionStartResponse } from '@/types';
import { CheckCircle, XCircle, ChevronRight, Clock, ExternalLink, Video, Mic } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';

interface Props {
  testId: string;
  testName: string;
  projectId: string;
}

type Phase = 'intro' | 'running' | 'done';

export function TestRunner({ testId, testName, projectId }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [session, setSession] = useState<SessionStartResponse | null>(null);
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [taskTimings, setTaskTimings] = useState<Record<string, { start: number; duration?: number; completed: boolean }>>({});
  const [testerName, setTesterName] = useState('');
  const [testerEmail, setTesterEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [recordingFailed, setRecordingFailed] = useState(false);
  const taskStart = useRef<number>(Date.now());

  const currentTask = session?.tasks[currentTaskIdx] ?? null;
  const { flush } = useTracker(session?.sessionId ?? null, currentTask?.id ?? null);
  const { state: recState, uploadError, start: startRecording, stop: stopRecording } = useRecording(recordingEnabled);

  useEffect(() => {
    if (phase === 'running' && currentTask) {
      taskStart.current = Date.now();
    }
  }, [currentTaskIdx, phase, currentTask]);

  const startSession = async () => {
    const res = await fetch(`/api/tests/${testId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tester_name: testerName || undefined,
        tester_email: testerEmail || undefined,
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
      }),
    });
    const data = await res.json();
    setSession(data);
    setPhase('running');
    taskStart.current = Date.now();
    if (recordingEnabled) await startRecording();
  };

  const completeTask = (completed: boolean) => {
    if (!currentTask) return;
    const duration = Date.now() - taskStart.current;
    const newTimings = { ...taskTimings, [currentTask.id]: { start: taskStart.current, duration, completed } };
    setTaskTimings(newTimings);

    if (currentTaskIdx < (session!.tasks.length - 1)) {
      setCurrentTaskIdx(i => i + 1);
    } else {
      finishSession(newTimings);
    }
  };

  const finishSession = async (timings: typeof taskTimings) => {
    if (!session || submitting) return;
    setSubmitting(true);
    await flush();

    const recordingUrl = await stopRecording();
    if (recordingEnabled && !recordingUrl) setRecordingFailed(true);

    const taskResults = Object.entries(timings).map(([task_id, t]) => ({
      task_id,
      duration_ms: t.duration ?? 0,
      completed: t.completed,
    }));

    await fetch(`/api/sessions/${session.sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, taskResults, recording_url: recordingUrl }),
    });

    sendNotification(
      'New test session completed!',
      `A tester finished "${testName}"`,
      `/projects/${projectId}/tests/${testId}/results`,
    );

    setPhase('done');
    setSubmitting(false);
  };

  if (phase === 'intro') {
    return (
      <IntroScreen
        testName={testName}
        onStart={startSession}
        name={testerName}
        email={testerEmail}
        onNameChange={setTesterName}
        onEmailChange={setTesterEmail}
        recordingEnabled={recordingEnabled}
        onRecordingChange={setRecordingEnabled}
      />
    );
  }

  if (phase === 'done') {
    return <DoneScreen recordingFailed={recordingFailed} />;
  }

  const tasks = session!.tasks;
  const progress = ((currentTaskIdx) / tasks.length) * 100;

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-4 flex-shrink-0">
        <span className="text-gray-400 text-sm font-medium">{testName}</span>
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-gray-500 text-xs">{currentTaskIdx + 1} / {tasks.length}</span>
        {recState === 'recording' && (
          <span className="flex items-center gap-1.5 text-xs text-red-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" /> REC
          </span>
        )}
        {recState === 'uploading' && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Saving recording…
          </span>
        )}
        {recState === 'error' && (
          <span className="text-xs text-red-400">Recording failed</span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left task panel */}
        <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Tasks</p>
            <div className="space-y-1.5">
              {tasks.map((task, i) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={i}
                  current={i === currentTaskIdx}
                  timing={taskTimings[task.id]}
                />
              ))}
            </div>
          </div>

          {currentTask && (
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">{currentTaskIdx + 1}</span>
                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Current Task</p>
              </div>
              <p className="text-white text-sm leading-relaxed flex-1">{currentTask.instruction}</p>
              {currentTask.success_criteria && (
                <p className="text-gray-500 text-xs mt-2 p-2 bg-gray-800 rounded-lg">{currentTask.success_criteria}</p>
              )}
              <TaskTimer taskStart={taskStart.current} />
              <div className="mt-4 space-y-2">
                <Button className="w-full" onClick={() => completeTask(true)}>
                  <CheckCircle size={16} /> Mark Complete
                </Button>
                <button
                  onClick={() => completeTask(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-amber-400 border border-amber-800/60 bg-amber-950/30 hover:bg-amber-950/60 transition-colors"
                >
                  <XCircle size={15} /> Can't complete this task
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prototype iframe */}
        <div className="flex-1 relative">
          {session?.prototypeUrl ? (
            <>
              <iframe
                src={session.prototypeUrl}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="Prototype"
              />
              <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
              <ExternalLink size={40} className="text-gray-700" />
              <p className="text-sm">No prototype URL configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <input
          placeholder="Optional notes for this session..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
        />
        <Button variant="danger" size="sm" disabled={submitting} onClick={() => finishSession(taskTimings)}>
          End Session
        </Button>
      </div>
    </div>
  );
}

function TaskTimer({ taskStart }: { taskStart: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - taskStart), 1000);
    return () => clearInterval(t);
  }, [taskStart]);
  return (
    <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-3">
      <Clock size={12} />
      <span>{formatDuration(elapsed)}</span>
    </div>
  );
}

function TaskItem({ task, index, current, timing }: {
  task: Task;
  index: number;
  current: boolean;
  timing?: { completed: boolean };
}) {
  const isDone = !!timing;
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${current ? 'bg-indigo-900/50 text-indigo-200' : isDone ? 'text-gray-600' : 'text-gray-500'}`}>
      {isDone && timing.completed ? (
        <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
      ) : isDone && !timing.completed ? (
        <XCircle size={14} className="text-amber-500 flex-shrink-0" />
      ) : current ? (
        <ChevronRight size={14} className="text-indigo-400 flex-shrink-0" />
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border border-gray-700 flex-shrink-0 text-center text-[10px] leading-3">{index + 1}</span>
      )}
      <span className="truncate">{task.instruction}</span>
    </div>
  );
}

function IntroScreen({
  testName, onStart, name, email, onNameChange, onEmailChange,
  recordingEnabled, onRecordingChange,
}: {
  testName: string; onStart: () => void;
  name: string; email: string;
  onNameChange: (v: string) => void; onEmailChange: (v: string) => void;
  recordingEnabled: boolean; onRecordingChange: (v: boolean) => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ExternalLink size={24} className="text-indigo-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">{testName}</h1>
        <p className="text-gray-400 text-sm mb-6">You'll be asked to complete a series of tasks. We'll record where you click to help us improve the design.</p>
        <div className="space-y-3 mb-4 text-left">
          <input placeholder="Your name (optional)" value={name} onChange={e => onNameChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500" />
          <input placeholder="Your email (optional)" value={email} onChange={e => onEmailChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500" />
        </div>
        <button
          onClick={() => onRecordingChange(!recordingEnabled)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors mb-6 text-left ${
            recordingEnabled
              ? 'border-indigo-500/60 bg-indigo-900/30 text-indigo-300'
              : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
          }`}
        >
          <div className={`flex-shrink-0 flex items-center justify-center gap-1 ${recordingEnabled ? 'text-indigo-400' : 'text-gray-600'}`}>
            <Video size={15} />
            <Mic size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Allow screen &amp; mic recording</p>
            <p className="text-xs mt-0.5 opacity-70">Optional — helps researchers replay your session</p>
          </div>
          <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
            recordingEnabled ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600'
          }`}>
            {recordingEnabled && <CheckCircle size={12} className="text-white" />}
          </div>
        </button>
        <Button className="w-full" size="lg" onClick={onStart}>
          Start Test <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}

function DoneScreen({ recordingFailed }: { recordingFailed: boolean }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">All done!</h1>
        <p className="text-gray-400">Thank you for completing the test. You can close this window.</p>
        {recordingFailed && (
          <p className="text-amber-400 text-xs mt-3">Note: the screen recording could not be saved.</p>
        )}
      </div>
    </div>
  );
}
