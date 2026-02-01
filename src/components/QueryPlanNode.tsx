import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import {
  Table2,
  GitMerge,
  ArrowUpDown,
  Layers,
  Filter,
  Combine,
  Database,
  Box,
} from 'lucide-react';
import type { PlanNode, NodeType, AccessType } from '../types';

interface QueryPlanNodeData extends PlanNode {
  maxCost: number;
}

const nodeIcons: Record<NodeType, React.ElementType> = {
  select: Database,
  table: Table2,
  join: GitMerge,
  sort: ArrowUpDown,
  group: Layers,
  distinct: Filter,
  union: Combine,
  subquery: Database,
  temp_table: Box,
  buffer: Box,
};

const nodeLabels: Record<NodeType, string> = {
  select: 'SELECT',
  table: 'Table Scan',
  join: 'JOIN',
  sort: 'SORT',
  group: 'GROUP',
  distinct: 'DISTINCT',
  union: 'UNION',
  subquery: 'Subquery',
  temp_table: 'Temp Table',
  buffer: 'Buffer',
};

const accessTypeColorMap: Record<AccessType, string> = {
  system: '#10b981',
  const: '#10b981',
  eq_ref: '#06b6d4',
  ref: '#06b6d4',
  fulltext: '#8b5cf6',
  ref_or_null: '#8b5cf6',
  index_merge: '#f59e0b',
  unique_subquery: '#8b5cf6',
  index_subquery: '#8b5cf6',
  range: '#f59e0b',
  index: '#f59e0b',
  ALL: '#ef4444',
};

function getCostColor(cost: number, maxCost: number): string {
  if (maxCost === 0) return '#06b6d4';
  const ratio = cost / maxCost;

  if (ratio < 0.33) return '#06b6d4'; // cyan - low cost
  if (ratio < 0.66) return '#8b5cf6'; // purple - medium cost
  if (ratio < 0.85) return '#f59e0b'; // amber - high cost
  return '#ef4444'; // red - very high cost
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

function QueryPlanNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as QueryPlanNodeData;
  const {
    type,
    label,
    cost,
    rows,
    accessType,
    key,
    extra,
    isCriticalPath,
    maxCost,
  } = nodeData;

  const Icon = nodeIcons[type] || Table2;
  const costColor = type === 'table' && accessType
    ? accessTypeColorMap[accessType]
    : getCostColor(cost, maxCost);

  const hasWarnings = extra.some(e =>
    e.includes('filesort') || e.includes('temporary')
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`
        relative min-w-[260px] rounded-xl overflow-hidden
        ${isCriticalPath ? 'critical-path' : ''}
      `}
      style={{
        background: 'rgba(18, 18, 18, 0.95)',
        border: `1px solid ${selected ? costColor : 'rgba(255, 255, 255, 0.1)'}`,
        boxShadow: selected
          ? `0 0 24px ${costColor}40`
          : isCriticalPath
          ? `0 0 16px ${costColor}30`
          : '0 4px 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Cost indicator bar */}
      <div
        className="h-1 w-full"
        style={{ background: costColor }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="p-2 rounded-lg"
            style={{ background: `${costColor}20` }}
          >
            <Icon
              size={20}
              style={{ color: costColor }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              {nodeLabels[type]}
            </div>
            <div
              className="font-mono text-sm font-medium truncate"
              title={label}
            >
              {label}
            </div>
          </div>
          {hasWarnings && (
            <div
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ background: '#f59e0b20', color: '#f59e0b' }}
            >
              !
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-gray-500">Cost</span>
            <span className="font-mono font-medium" style={{ color: costColor }}>
              {cost > 0 ? cost.toFixed(2) : '-'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500">Rows</span>
            <span className="font-mono font-medium">
              {rows > 0 ? formatNumber(rows) : '-'}
            </span>
          </div>
          {accessType && (
            <div className="flex flex-col col-span-2">
              <span className="text-gray-500">Access</span>
              <span
                className="font-mono text-xs"
                style={{ color: accessTypeColorMap[accessType] }}
              >
                {accessType}
                {key && ` (${key})`}
              </span>
            </div>
          )}
        </div>

        {/* Extra info pills */}
        {extra.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {extra.slice(0, 2).map((info, i) => (
              <span
                key={i}
                className={`
                  px-2 py-0.5 rounded text-xs font-medium
                  ${info.includes('filesort') || info.includes('temporary')
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/5 text-gray-400'
                  }
                `}
              >
                {info}
              </span>
            ))}
            {extra.length > 2 && (
              <span className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400">
                +{extra.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-transparent !border-2 !w-3 !h-3"
        style={{ borderColor: costColor }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-2 !w-3 !h-3"
        style={{ borderColor: costColor }}
      />
    </motion.div>
  );
}

export default memo(QueryPlanNode);
