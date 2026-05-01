export type TestType = 'ab' | 'usability' | 'prototype';
export type TestStatus = 'draft' | 'active' | 'closed';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type EventType = 'click' | 'mousemove' | 'scroll';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
  test_count?: number;
}

export interface Test {
  id: string;
  project_id: string;
  name: string;
  type: TestType;
  status: TestStatus;
  prototype_url: string | null;
  screenshot_url: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
  session_count?: number;
  variants?: Variant[];
  tasks?: Task[];
}

export interface Variant {
  id: string;
  test_id: string;
  name: string;
  url: string;
  weight: number;
}

export interface Task {
  id: string;
  test_id: string;
  sort_order: number;
  instruction: string;
  success_criteria: string | null;
}

export interface Session {
  id: string;
  test_id: string;
  variant_id: string | null;
  tester_name: string | null;
  tester_email: string | null;
  status: SessionStatus;
  started_at: number;
  completed_at: number | null;
  viewport_w: number | null;
  viewport_h: number | null;
  notes: string | null;
  recording_url: string | null;
}

export interface SessionTaskResult {
  session_id: string;
  task_id: string;
  instruction: string;
  sort_order: number;
  duration_ms: number | null;
  completed: number;
}

export interface TaskResult {
  id: string;
  session_id: string;
  task_id: string;
  started_at: number;
  completed_at: number | null;
  duration_ms: number | null;
  completed: number;
}

export interface Event {
  id?: number;
  session_id: string;
  task_id: string | null;
  type: EventType;
  x: number;
  y: number;
  timestamp: number;
  metadata: string | null;
}

export interface TestResults {
  test: Test;
  sessions: (Session & { variant_name?: string })[];
  taskStats: TaskStat[];
  clickEvents: Event[];
  variantComparison?: VariantStat[];
  sessionTaskResults?: SessionTaskResult[];
}

export interface TaskStat {
  task_id: string;
  instruction: string;
  avg_duration_ms: number;
  completion_rate: number;
  total_sessions: number;
  completed_sessions: number;
}

export interface VariantStat {
  variant_id: string;
  variant_name: string;
  session_count: number;
  avg_completion_rate: number;
  avg_duration_ms: number;
}

export interface SessionStartResponse {
  sessionId: string;
  variantId: string | null;
  prototypeUrl: string;
  tasks: Task[];
}
