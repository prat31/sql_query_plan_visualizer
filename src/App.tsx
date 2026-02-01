import { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gauge, Table2, Zap } from 'lucide-react';

import CommandCenter from './components/CommandCenter';
import QueryPlanNode from './components/QueryPlanNode';
import AnimatedEdge from './components/AnimatedEdge';
import DetailsPanel from './components/DetailsPanel';
import { parseExplainJSON } from './utils/parser';
import type { MySQLExplainJSON, PlanNode } from './types';

const nodeTypes = {
  queryPlanNode: QueryPlanNode,
};

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

export default function App() {
  const [showInput, setShowInput] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [planNodes, setPlanNodes] = useState<PlanNode[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedNode, setSelectedNode] = useState<PlanNode | null>(null);

  const handleVisualize = useCallback((data: MySQLExplainJSON) => {
    const result = parseExplainJSON(data);
    setNodes(result.nodes as Node[]);
    setEdges(result.edges as Edge[]);
    setPlanNodes(result.planNodes);
    setTotalCost(result.totalCost);
    setSelectedNode(null);
    setShowInput(false);
  }, [setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const planNode = planNodes.find(n => n.id === node.id);
    setSelectedNode(planNode || null);
  }, [planNodes]);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleBack = useCallback(() => {
    setShowInput(true);
    setNodes([]);
    setEdges([]);
    setPlanNodes([]);
    setTotalCost(0);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // Stats summary
  const stats = useMemo(() => {
    const tables = planNodes.filter(n => n.type === 'table').length;
    const joins = planNodes.filter(n => n.type === 'join').length;
    const hasFilesort = planNodes.some(n => n.extra.some(e => e.includes('filesort')));
    const hasTemp = planNodes.some(n => n.extra.some(e => e.includes('temporary')));

    return { tables, joins, hasFilesort, hasTemp };
  }, [planNodes]);

  return (
    <div className="w-full h-full grid-bg relative">
      {/* Command Center (Input) */}
      <CommandCenter onVisualize={handleVisualize} isVisible={showInput} />

      {/* Visualizer View */}
      <AnimatePresence>
        {!showInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Top Bar */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="glass border-b border-white/5 px-4 py-3 flex items-center justify-between z-30"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                    text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft size={16} />
                  New Query
                </button>

                <div className="h-6 w-px bg-white/10" />

                <div className="flex items-center gap-6">
                  <StatBadge
                    icon={Gauge}
                    label="Total Cost"
                    value={totalCost.toFixed(2)}
                    color="#8b5cf6"
                  />
                  <StatBadge
                    icon={Table2}
                    label="Tables"
                    value={stats.tables.toString()}
                    color="#06b6d4"
                  />
                  {stats.joins > 0 && (
                    <StatBadge
                      icon={Zap}
                      label="Joins"
                      value={stats.joins.toString()}
                      color="#10b981"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {stats.hasFilesort && (
                  <WarningBadge label="Using filesort" />
                )}
                {stats.hasTemp && (
                  <WarningBadge label="Using temporary" />
                )}
              </div>
            </motion.div>

            {/* Main Canvas */}
            <div className="flex-1 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultEdgeOptions={{
                  type: 'animatedEdge',
                }}
              >
                <Background
                  gap={40}
                  size={1}
                  color="rgba(255, 255, 255, 0.03)"
                />
                <Controls
                  className="!bg-void-lighter !border-white/10 !rounded-xl"
                  showInteractive={false}
                />
                <MiniMap
                  nodeColor={(node) => {
                    const data = node.data as unknown as PlanNode & { maxCost: number };
                    if (data.isCriticalPath) return '#ef4444';
                    if (data.accessType === 'ALL') return '#ef4444';
                    if (data.type === 'join') return '#10b981';
                    return '#8b5cf6';
                  }}
                  className="!bg-void-light !border-white/10 !rounded-xl"
                  maskColor="rgba(0, 0, 0, 0.8)"
                />
              </ReactFlow>

              {/* Details Panel */}
              <DetailsPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface StatBadgeProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

function StatBadge({ icon: Icon, label, value, color }: StatBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} style={{ color }} />
      <div className="text-xs">
        <span className="text-gray-500">{label}: </span>
        <span className="font-mono font-medium" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

function WarningBadge({ label }: { label: string }) {
  return (
    <div className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium">
      {label}
    </div>
  );
}
