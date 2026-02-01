import type { Node, Edge } from '@xyflow/react';
import type {
  MySQLExplainJSON,
  QueryBlock,
  TableInfo,
  NestedLoopItem,
  PlanNode,
  NodeType,
  CostInfo,
} from '../types';

let nodeIdCounter = 0;

function generateId(): string {
  return `node-${++nodeIdCounter}`;
}

function parseCost(costInfo?: CostInfo): number {
  if (!costInfo) return 0;
  const cost = costInfo.query_cost || costInfo.read_cost || costInfo.prefix_cost;
  return cost ? parseFloat(cost) : 0;
}

function getExtraInfo(table: TableInfo): string[] {
  const extra: string[] = [];
  if (table.using_index) extra.push('Using index');
  if (table.using_temporary) extra.push('Using temporary');
  if (table.using_filesort) extra.push('Using filesort');
  if (table.using_index_condition) extra.push('Using index condition');
  if (table.message) extra.push(table.message);
  return extra;
}

function parseTable(table: TableInfo, parentId?: string): { nodes: PlanNode[]; edges: Array<{ source: string; target: string }> } {
  const nodes: PlanNode[] = [];
  const edges: Array<{ source: string; target: string }> = [];

  const nodeId = generateId();
  const node: PlanNode = {
    id: nodeId,
    type: 'table',
    label: table.table_name || 'Unknown Table',
    cost: parseCost(table.cost_info),
    rows: table.rows_examined_per_scan || table.rows_produced_per_join || 0,
    table: table.table_name,
    accessType: table.access_type,
    key: table.key,
    keyParts: table.used_key_parts,
    condition: table.attached_condition,
    extra: getExtraInfo(table),
    children: [],
    rawData: table as unknown as Record<string, unknown>,
  };

  nodes.push(node);

  if (parentId) {
    edges.push({ source: nodeId, target: parentId });
  }

  // Handle materialized subqueries
  if (table.materialized_from_subquery) {
    const subResult = parseQueryBlock(table.materialized_from_subquery.query_block, nodeId, 'subquery');
    nodes.push(...subResult.nodes);
    edges.push(...subResult.edges);
    node.children.push(...subResult.nodes.map(n => n.id));
  }

  return { nodes, edges };
}

function parseNestedLoop(
  items: NestedLoopItem[],
  parentId?: string
): { nodes: PlanNode[]; edges: Array<{ source: string; target: string }> } {
  const nodes: PlanNode[] = [];
  const edges: Array<{ source: string; target: string }> = [];

  if (items.length === 0) return { nodes, edges };

  // Create join node if multiple tables
  if (items.length > 1) {
    const joinId = generateId();
    const totalCost = items.reduce((sum, item) => sum + parseCost(item.table.cost_info), 0);
    const totalRows = items.reduce((sum, item) => {
      const rows = item.table.rows_produced_per_join || item.table.rows_examined_per_scan || 0;
      return sum === 0 ? rows : sum * rows;
    }, 0);

    const joinNode: PlanNode = {
      id: joinId,
      type: 'join',
      label: 'Nested Loop Join',
      cost: totalCost,
      rows: totalRows,
      extra: [],
      children: [],
      rawData: { items },
    };
    nodes.push(joinNode);

    if (parentId) {
      edges.push({ source: joinId, target: parentId });
    }

    // Parse each table
    items.forEach((item) => {
      const tableResult = parseTable(item.table, joinId);
      nodes.push(...tableResult.nodes);
      edges.push(...tableResult.edges);
      joinNode.children.push(...tableResult.nodes.map(n => n.id));
    });
  } else {
    // Single table
    const tableResult = parseTable(items[0].table, parentId);
    nodes.push(...tableResult.nodes);
    edges.push(...tableResult.edges);
  }

  return { nodes, edges };
}

function parseQueryBlock(
  block: QueryBlock,
  parentId?: string,
  blockType: NodeType = 'select'
): { nodes: PlanNode[]; edges: Array<{ source: string; target: string }> } {
  const nodes: PlanNode[] = [];
  const edges: Array<{ source: string; target: string }> = [];

  let currentParent = parentId;

  // Handle ordering operation (ORDER BY)
  if (block.ordering_operation) {
    const sortId = generateId();
    const sortNode: PlanNode = {
      id: sortId,
      type: 'sort',
      label: 'ORDER BY',
      cost: parseCost(block.ordering_operation.cost_info),
      rows: 0,
      extra: [],
      children: [],
      rawData: block.ordering_operation as unknown as Record<string, unknown>,
    };

    if (block.ordering_operation.using_filesort) {
      sortNode.extra.push('Using filesort');
    }
    if (block.ordering_operation.using_temporary_table) {
      sortNode.extra.push('Using temporary table');
    }

    nodes.push(sortNode);
    if (currentParent) {
      edges.push({ source: sortId, target: currentParent });
    }
    currentParent = sortId;

    // Parse nested content
    if (block.ordering_operation.nested_loop) {
      const nestedResult = parseNestedLoop(block.ordering_operation.nested_loop, currentParent);
      nodes.push(...nestedResult.nodes);
      edges.push(...nestedResult.edges);
      sortNode.children.push(...nestedResult.nodes.map(n => n.id));
    }

    if (block.ordering_operation.grouping_operation) {
      const groupResult = parseGroupingOperation(block.ordering_operation.grouping_operation, currentParent);
      nodes.push(...groupResult.nodes);
      edges.push(...groupResult.edges);
    }

    if (block.ordering_operation.table) {
      const tableResult = parseTable(block.ordering_operation.table, currentParent);
      nodes.push(...tableResult.nodes);
      edges.push(...tableResult.edges);
    }

    return { nodes, edges };
  }

  // Handle grouping operation (GROUP BY)
  if (block.grouping_operation) {
    const groupResult = parseGroupingOperation(block.grouping_operation, currentParent);
    nodes.push(...groupResult.nodes);
    edges.push(...groupResult.edges);
    return { nodes, edges };
  }

  // Handle duplicates removal (DISTINCT)
  if (block.duplicates_removal) {
    const distinctId = generateId();
    const distinctNode: PlanNode = {
      id: distinctId,
      type: 'distinct',
      label: 'DISTINCT',
      cost: parseCost(block.duplicates_removal.cost_info),
      rows: 0,
      extra: [],
      children: [],
      rawData: block.duplicates_removal as unknown as Record<string, unknown>,
    };

    if (block.duplicates_removal.using_filesort) {
      distinctNode.extra.push('Using filesort');
    }
    if (block.duplicates_removal.using_temporary_table) {
      distinctNode.extra.push('Using temporary table');
    }

    nodes.push(distinctNode);
    if (currentParent) {
      edges.push({ source: distinctId, target: currentParent });
    }
    currentParent = distinctId;

    if (block.duplicates_removal.nested_loop) {
      const nestedResult = parseNestedLoop(block.duplicates_removal.nested_loop, currentParent);
      nodes.push(...nestedResult.nodes);
      edges.push(...nestedResult.edges);
    }

    if (block.duplicates_removal.table) {
      const tableResult = parseTable(block.duplicates_removal.table, currentParent);
      nodes.push(...tableResult.nodes);
      edges.push(...tableResult.edges);
    }

    return { nodes, edges };
  }

  // Handle union result
  if (block.union_result) {
    const unionId = generateId();
    const unionNode: PlanNode = {
      id: unionId,
      type: 'union',
      label: 'UNION',
      cost: 0,
      rows: 0,
      extra: block.union_result.using_temporary_table ? ['Using temporary table'] : [],
      children: [],
      rawData: block.union_result as unknown as Record<string, unknown>,
    };

    nodes.push(unionNode);
    if (currentParent) {
      edges.push({ source: unionId, target: currentParent });
    }

    block.union_result.query_specifications?.forEach((spec) => {
      const specResult = parseQueryBlock(spec.query_block, unionId);
      nodes.push(...specResult.nodes);
      edges.push(...specResult.edges);
    });

    return { nodes, edges };
  }

  // Handle nested loop
  if (block.nested_loop) {
    const nestedResult = parseNestedLoop(block.nested_loop, currentParent);
    nodes.push(...nestedResult.nodes);
    edges.push(...nestedResult.edges);
  }

  // Handle single table
  if (block.table) {
    const tableResult = parseTable(block.table, currentParent);
    nodes.push(...tableResult.nodes);
    edges.push(...tableResult.edges);
  }

  // Handle subqueries
  const allSubqueries = [
    ...(block.subqueries || []),
    ...(block.optimized_away_subqueries || []),
    ...(block.attached_subqueries || []),
  ];

  allSubqueries.forEach((sub) => {
    const subResult = parseQueryBlock(sub.query_block, currentParent, 'subquery');
    nodes.push(...subResult.nodes);
    edges.push(...subResult.edges);
  });

  // Handle nested query block
  if (block.query_block) {
    const nestedBlockResult = parseQueryBlock(block.query_block, currentParent);
    nodes.push(...nestedBlockResult.nodes);
    edges.push(...nestedBlockResult.edges);
  }

  // Handle message-only blocks
  if (block.message && nodes.length === 0) {
    const msgNode: PlanNode = {
      id: generateId(),
      type: blockType,
      label: block.message,
      cost: 0,
      rows: 0,
      extra: [],
      children: [],
      rawData: block as unknown as Record<string, unknown>,
    };
    nodes.push(msgNode);
    if (currentParent) {
      edges.push({ source: msgNode.id, target: currentParent });
    }
  }

  return { nodes, edges };
}

function parseGroupingOperation(
  groupOp: QueryBlock['grouping_operation'],
  parentId?: string
): { nodes: PlanNode[]; edges: Array<{ source: string; target: string }> } {
  const nodes: PlanNode[] = [];
  const edges: Array<{ source: string; target: string }> = [];

  if (!groupOp) return { nodes, edges };

  const groupId = generateId();
  const groupNode: PlanNode = {
    id: groupId,
    type: 'group',
    label: 'GROUP BY',
    cost: parseCost(groupOp.cost_info),
    rows: 0,
    extra: [],
    children: [],
    rawData: groupOp as unknown as Record<string, unknown>,
  };

  if (groupOp.using_filesort) {
    groupNode.extra.push('Using filesort');
  }
  if (groupOp.using_temporary_table) {
    groupNode.extra.push('Using temporary table');
  }

  nodes.push(groupNode);
  if (parentId) {
    edges.push({ source: groupId, target: parentId });
  }

  if (groupOp.nested_loop) {
    const nestedResult = parseNestedLoop(groupOp.nested_loop, groupId);
    nodes.push(...nestedResult.nodes);
    edges.push(...nestedResult.edges);
  }

  if (groupOp.table) {
    const tableResult = parseTable(groupOp.table, groupId);
    nodes.push(...tableResult.nodes);
    edges.push(...tableResult.edges);
  }

  if (groupOp.buffer_result) {
    const bufferResult = parseBufferResult(groupOp.buffer_result, groupId);
    nodes.push(...bufferResult.nodes);
    edges.push(...bufferResult.edges);
  }

  return { nodes, edges };
}

function parseBufferResult(
  buffer: QueryBlock['grouping_operation'],
  parentId?: string
): { nodes: PlanNode[]; edges: Array<{ source: string; target: string }> } {
  const nodes: PlanNode[] = [];
  const edges: Array<{ source: string; target: string }> = [];

  if (!buffer) return { nodes, edges };

  const bufferId = generateId();
  const bufferNode: PlanNode = {
    id: bufferId,
    type: 'buffer',
    label: 'Buffer Result',
    cost: 0,
    rows: 0,
    extra: buffer.using_temporary_table ? ['Using temporary table'] : [],
    children: [],
    rawData: buffer as unknown as Record<string, unknown>,
  };

  nodes.push(bufferNode);
  if (parentId) {
    edges.push({ source: bufferId, target: parentId });
  }

  if (buffer.nested_loop) {
    const nestedResult = parseNestedLoop(buffer.nested_loop, bufferId);
    nodes.push(...nestedResult.nodes);
    edges.push(...nestedResult.edges);
  }

  if (buffer.table) {
    const tableResult = parseTable(buffer.table, bufferId);
    nodes.push(...tableResult.nodes);
    edges.push(...tableResult.edges);
  }

  return { nodes, edges };
}

function markCriticalPath(nodes: PlanNode[]): void {
  if (nodes.length === 0) return;

  // Find the most expensive path
  const nodeCosts = new Map<string, number>();

  // Calculate cumulative costs
  const calculateCumulativeCost = (nodeId: string): number => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 0;

    const childCosts = node.children.map(calculateCumulativeCost);
    const maxChildCost = Math.max(0, ...childCosts);
    const totalCost = node.cost + maxChildCost;
    nodeCosts.set(nodeId, totalCost);
    return totalCost;
  };

  // Find root nodes (nodes that aren't children of any other node)
  const allChildren = new Set(nodes.flatMap(n => n.children));
  const rootNodes = nodes.filter(n => !allChildren.has(n.id));

  rootNodes.forEach(root => calculateCumulativeCost(root.id));

  // Mark the path with highest costs
  const markPath = (nodeId: string): void => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.isCriticalPath = true;

    if (node.children.length > 0) {
      const childCostPairs = node.children.map(childId => ({
        id: childId,
        cost: nodeCosts.get(childId) || 0,
      }));
      childCostPairs.sort((a, b) => b.cost - a.cost);
      markPath(childCostPairs[0].id);
    }
  };

  // Start from the most expensive root
  const rootCosts = rootNodes.map(n => ({
    id: n.id,
    cost: nodeCosts.get(n.id) || 0,
  }));
  rootCosts.sort((a, b) => b.cost - a.cost);
  if (rootCosts.length > 0) {
    markPath(rootCosts[0].id);
  }
}

export function parseExplainJSON(json: MySQLExplainJSON): {
  nodes: Node[];
  edges: Edge[];
  planNodes: PlanNode[];
  totalCost: number;
} {
  nodeIdCounter = 0;

  const result = parseQueryBlock(json.query_block);
  const planNodes = result.nodes;

  // Mark critical path
  markCriticalPath(planNodes);

  // Calculate total cost
  const totalCost = planNodes.reduce((sum, node) => sum + node.cost, 0);

  // Find max cost for color scaling
  const maxCost = Math.max(...planNodes.map(n => n.cost), 1);

  // Convert to ReactFlow nodes with layout
  const nodes: Node[] = planNodes.map((node) => ({
    id: node.id,
    type: 'queryPlanNode',
    position: { x: 0, y: 0 }, // Will be calculated by layout
    data: {
      ...node,
      maxCost,
    },
  }));

  // Apply layout
  applyLayout(nodes, result.edges);

  // Convert to ReactFlow edges
  const edges: Edge[] = result.edges.map((edge, index) => {
    const sourceNode = planNodes.find(n => n.id === edge.source);
    return {
      id: `edge-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'animatedEdge',
      animated: true,
      data: {
        rows: sourceNode?.rows || 0,
        isCriticalPath: sourceNode?.isCriticalPath || false,
      },
    };
  });

  return { nodes, edges, planNodes, totalCost };
}

function applyLayout(nodes: Node[], edges: Array<{ source: string; target: string }>): void {
  const nodeWidth = 280;
  const nodeHeight = 120;
  const horizontalGap = 60;
  const verticalGap = 80;

  // Build adjacency for tree layout
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  edges.forEach(({ source, target }) => {
    // source -> target means source is child of target
    parentMap.set(source, target);
    if (!childrenMap.has(target)) {
      childrenMap.set(target, []);
    }
    childrenMap.get(target)!.push(source);
  });

  // Find roots (nodes with no parent)
  const roots = nodes.filter(n => !parentMap.has(n.id));

  // Calculate subtree widths
  const subtreeWidths = new Map<string, number>();

  const calcWidth = (nodeId: string): number => {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      subtreeWidths.set(nodeId, nodeWidth);
      return nodeWidth;
    }

    const totalChildWidth = children.reduce((sum, childId) => {
      return sum + calcWidth(childId) + horizontalGap;
    }, -horizontalGap);

    const width = Math.max(nodeWidth, totalChildWidth);
    subtreeWidths.set(nodeId, width);
    return width;
  };

  roots.forEach(root => calcWidth(root.id));

  // Position nodes top-down
  const positioned = new Set<string>();

  const positionNode = (nodeId: string, x: number, y: number): void => {
    if (positioned.has(nodeId)) return;
    positioned.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.position = { x, y };

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) return;

    const totalChildWidth = children.reduce((sum, childId) => {
      return sum + (subtreeWidths.get(childId) || nodeWidth) + horizontalGap;
    }, -horizontalGap);

    let childX = x + (nodeWidth - totalChildWidth) / 2;

    children.forEach(childId => {
      const childWidth = subtreeWidths.get(childId) || nodeWidth;
      const childCenterX = childX + childWidth / 2 - nodeWidth / 2;
      positionNode(childId, childCenterX, y + nodeHeight + verticalGap);
      childX += childWidth + horizontalGap;
    });
  };

  // Position from roots (left to right)
  let rootX = 0;
  roots.forEach(root => {
    const width = subtreeWidths.get(root.id) || nodeWidth;
    positionNode(root.id, rootX, 0);
    rootX += width + horizontalGap * 2;
  });

  // Handle orphaned nodes
  let orphanY = 0;
  nodes.forEach(node => {
    if (!positioned.has(node.id)) {
      node.position = { x: rootX, y: orphanY };
      orphanY += nodeHeight + verticalGap;
    }
  });
}

export function validateExplainJSON(input: string): { valid: boolean; error?: string; data?: MySQLExplainJSON } {
  try {
    const parsed = JSON.parse(input);

    if (!parsed.query_block) {
      return { valid: false, error: 'Invalid MySQL EXPLAIN JSON: missing query_block' };
    }

    return { valid: true, data: parsed };
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
}
