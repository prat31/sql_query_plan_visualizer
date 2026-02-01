import { memo } from 'react';
import {
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

interface AnimatedEdgeData {
  rows?: number;
  isCriticalPath?: boolean;
}

function AnimatedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as AnimatedEdgeData | undefined;
  const rows = edgeData?.rows || 0;
  const isCriticalPath = edgeData?.isCriticalPath || false;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  // Calculate stroke width based on row count
  const baseWidth = 2;
  const maxWidth = 6;
  const logRows = rows > 0 ? Math.log10(rows + 1) : 0;
  const strokeWidth = Math.min(baseWidth + logRows * 0.5, maxWidth);

  // Color based on critical path
  const color = isCriticalPath
    ? '#ef4444'
    : selected
    ? '#8b5cf6'
    : '#3f3f46';

  // Animation speed based on row count (more rows = faster)
  const animationDuration = Math.max(0.5, 2 - logRows * 0.2);

  return (
    <g className="animated-edge">
      {/* Background edge */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={0.3}
      />
      {/* Animated particles */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="8 8"
        style={{
          animation: `flow ${animationDuration}s linear infinite`,
        }}
      />
      {/* Glow effect for critical path */}
      {isCriticalPath && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeOpacity={0.2}
          filter="blur(4px)"
        />
      )}
    </g>
  );
}

export default memo(AnimatedEdge);
