'use client';
import { formatDuration, formatPercent } from '@/lib/utils';
import type { TaskStat, VariantStat } from '@/types';
import { CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';

export function AnalyticsPanel({ taskStats, variantComparison, sessionCount }: {
  taskStats: TaskStat[];
  variantComparison?: VariantStat[];
  sessionCount: number;
}) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users size={18} />} label="Total Sessions" value={String(sessionCount)} color="indigo" />
        <StatCard
          icon={<CheckCircle size={18} />}
          label="Avg Completion"
          value={formatPercent(taskStats.length ? taskStats.reduce((s, t) => s + (t.completion_rate || 0), 0) / taskStats.length : null)}
          color="emerald"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Avg Task Time"
          value={formatDuration(taskStats.length ? taskStats.reduce((s, t) => s + (t.avg_duration_ms || 0), 0) / taskStats.length : null)}
          color="amber"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Tasks Defined"
          value={String(taskStats.length)}
          color="purple"
        />
      </div>

      {/* Per-task stats */}
      {taskStats.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Task Breakdown</h3>
          <div className="space-y-3">
            {taskStats.map((stat, i) => (
              <TaskStatRow key={stat.task_id} index={i + 1} stat={stat} />
            ))}
          </div>
        </div>
      )}

      {/* A/B comparison */}
      {variantComparison && variantComparison.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">A/B Variant Comparison</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Variant</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Sessions</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Completion</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variantComparison.map(v => (
                  <tr key={v.variant_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.variant_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{v.session_count}</td>
                    <td className="px-4 py-3 text-right">
                      <CompletionBar value={v.avg_completion_rate} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatDuration(v.avg_duration_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'indigo' | 'emerald' | 'amber' | 'purple';
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colors[color]}`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function TaskStatRow({ index, stat }: { index: number; stat: TaskStat }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">{index}</span>
          <p className="text-sm text-gray-800">{stat.instruction}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-semibold text-gray-900">{formatDuration(stat.avg_duration_ms)}</div>
          <div className="text-xs text-gray-400">avg time</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${stat.completion_rate || 0}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 w-12 text-right">
          {formatPercent(stat.completion_rate)} done
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-1">{stat.completed_sessions ?? 0} / {stat.total_sessions ?? 0} completed</p>
    </div>
  );
}

function CompletionBar({ value }: { value: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${value || 0}%` }} />
      </div>
      <span className="text-gray-700 w-10">{formatPercent(value)}</span>
    </div>
  );
}
