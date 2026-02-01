import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  Filter,
  Rows3,
  Gauge,
  AlertTriangle,
  Info,
  Database,
} from 'lucide-react';
import type { PlanNode, AccessType } from '../types';

interface DetailsPanelProps {
  node: PlanNode | null;
  onClose: () => void;
}

const accessTypeDescriptions: Record<AccessType, { label: string; description: string; severity: 'good' | 'ok' | 'warning' | 'bad' }> = {
  system: { label: 'System', description: 'Single row (system table)', severity: 'good' },
  const: { label: 'Const', description: 'Single row (unique index lookup)', severity: 'good' },
  eq_ref: { label: 'Eq Ref', description: 'One row per key from previous table', severity: 'good' },
  ref: { label: 'Ref', description: 'All rows matching index value', severity: 'ok' },
  fulltext: { label: 'Fulltext', description: 'Fulltext index search', severity: 'ok' },
  ref_or_null: { label: 'Ref or Null', description: 'Like ref, plus NULL values', severity: 'ok' },
  index_merge: { label: 'Index Merge', description: 'Multiple index scans merged', severity: 'warning' },
  unique_subquery: { label: 'Unique Subquery', description: 'Unique index lookup in subquery', severity: 'ok' },
  index_subquery: { label: 'Index Subquery', description: 'Non-unique index lookup in subquery', severity: 'ok' },
  range: { label: 'Range', description: 'Index range scan', severity: 'warning' },
  index: { label: 'Index', description: 'Full index scan', severity: 'warning' },
  ALL: { label: 'Full Table Scan', description: 'Scans entire table - consider adding an index', severity: 'bad' },
};

const severityColors = {
  good: '#10b981',
  ok: '#06b6d4',
  warning: '#f59e0b',
  bad: '#ef4444',
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toString();
}

export default function DetailsPanel({ node, onClose }: DetailsPanelProps) {
  if (!node) return null;

  const accessInfo = node.accessType ? accessTypeDescriptions[node.accessType] : null;

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute top-4 right-4 bottom-4 w-80 z-40 glass rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: accessInfo
                    ? `${severityColors[accessInfo.severity]}20`
                    : 'rgba(139, 92, 246, 0.2)',
                }}
              >
                <Database
                  size={18}
                  style={{
                    color: accessInfo
                      ? severityColors[accessInfo.severity]
                      : '#8b5cf6',
                  }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-white">{node.label}</h3>
                <p className="text-xs text-gray-400 capitalize">{node.type.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Access Type */}
            {accessInfo && (
              <div
                className="p-3 rounded-xl"
                style={{ background: `${severityColors[accessInfo.severity]}10` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-sm font-medium"
                    style={{ color: severityColors[accessInfo.severity] }}
                  >
                    {accessInfo.label}
                  </span>
                  {accessInfo.severity === 'bad' && (
                    <AlertTriangle size={14} className="text-red-400" />
                  )}
                </div>
                <p className="text-xs text-gray-400">{accessInfo.description}</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Gauge}
                label="Cost"
                value={node.cost > 0 ? node.cost.toFixed(2) : '-'}
                color="#8b5cf6"
              />
              <StatCard
                icon={Rows3}
                label="Rows"
                value={node.rows > 0 ? formatNumber(node.rows) : '-'}
                color="#06b6d4"
              />
            </div>

            {/* Key Info */}
            {node.key && (
              <div className="p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={14} className="text-green-400" />
                  <span className="text-sm font-medium text-gray-300">Key Used</span>
                </div>
                <p className="font-mono text-sm text-green-400">{node.key}</p>
                {node.keyParts && node.keyParts.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Parts: {node.keyParts.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Condition */}
            {node.condition && (
              <div className="p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Filter size={14} className="text-cyan-400" />
                  <span className="text-sm font-medium text-gray-300">Condition</span>
                </div>
                <p className="font-mono text-xs text-gray-400 break-all">
                  {node.condition}
                </p>
              </div>
            )}

            {/* Extra Info */}
            {node.extra.length > 0 && (
              <div className="p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Extra</span>
                </div>
                <div className="space-y-1">
                  {node.extra.map((info, i) => {
                    const isWarning = info.includes('filesort') || info.includes('temporary');
                    return (
                      <div
                        key={i}
                        className={`
                          flex items-center gap-2 px-2 py-1 rounded text-xs
                          ${isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-400'}
                        `}
                      >
                        {isWarning && <AlertTriangle size={12} />}
                        {info}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Critical Path Badge */}
            {node.isCriticalPath && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-sm font-medium text-red-400">Critical Path</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  This node is on the most expensive execution path.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5">
            <p className="text-xs text-gray-500 text-center">
              Click on other nodes to inspect them
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="p-3 rounded-xl bg-white/5">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color }} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="font-mono text-lg font-medium" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
