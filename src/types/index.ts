export interface MySQLExplainJSON {
  query_block: QueryBlock;
}

export interface QueryBlock {
  select_id?: number;
  cost_info?: CostInfo;
  table?: TableInfo;
  nested_loop?: NestedLoopItem[];
  ordering_operation?: OrderingOperation;
  grouping_operation?: GroupingOperation;
  duplicates_removal?: DuplicatesRemoval;
  query_block?: QueryBlock;
  union_result?: UnionResult;
  subqueries?: SubqueryInfo[];
  optimized_away_subqueries?: SubqueryInfo[];
  attached_subqueries?: SubqueryInfo[];
  message?: string;
}

export interface CostInfo {
  query_cost?: string;
  read_cost?: string;
  eval_cost?: string;
  prefix_cost?: string;
  data_read_per_join?: string;
  sort_cost?: string;
}

export interface TableInfo {
  table_name: string;
  access_type: AccessType;
  possible_keys?: string[];
  key?: string;
  used_key_parts?: string[];
  key_length?: string;
  ref?: string[];
  rows_examined_per_scan?: number;
  rows_produced_per_join?: number;
  filtered?: string;
  cost_info?: CostInfo;
  used_columns?: string[];
  attached_condition?: string;
  using_index?: boolean;
  using_index_condition?: string;
  using_temporary?: boolean;
  using_filesort?: boolean;
  materialized_from_subquery?: MaterializedFromSubquery;
  insert?: boolean;
  message?: string;
}

export type AccessType = 'system' | 'const' | 'eq_ref' | 'ref' | 'fulltext' | 'ref_or_null' |
  'index_merge' | 'unique_subquery' | 'index_subquery' | 'range' | 'index' | 'ALL';

export interface NestedLoopItem {
  table: TableInfo;
}

export interface OrderingOperation {
  using_filesort: boolean;
  using_temporary_table?: boolean;
  cost_info?: CostInfo;
  table?: TableInfo;
  nested_loop?: NestedLoopItem[];
  grouping_operation?: GroupingOperation;
  duplicates_removal?: DuplicatesRemoval;
  buffer_result?: BufferResult;
}

export interface GroupingOperation {
  using_filesort?: boolean;
  using_temporary_table?: boolean;
  cost_info?: CostInfo;
  table?: TableInfo;
  nested_loop?: NestedLoopItem[];
  buffer_result?: BufferResult;
}

export interface DuplicatesRemoval {
  using_filesort?: boolean;
  using_temporary_table?: boolean;
  cost_info?: CostInfo;
  table?: TableInfo;
  nested_loop?: NestedLoopItem[];
}

export interface BufferResult {
  using_temporary_table?: boolean;
  table?: TableInfo;
  nested_loop?: NestedLoopItem[];
}

export interface UnionResult {
  using_temporary_table: boolean;
  table_name: string;
  access_type: string;
  query_specifications: QuerySpecification[];
}

export interface QuerySpecification {
  dependent: boolean;
  cacheable: boolean;
  query_block: QueryBlock;
}

export interface SubqueryInfo {
  dependent?: boolean;
  cacheable?: boolean;
  using_temporary_table?: boolean;
  query_block: QueryBlock;
}

export interface MaterializedFromSubquery {
  using_temporary_table: boolean;
  query_block: QueryBlock;
}

// Parsed node for visualization
export interface PlanNode {
  id: string;
  type: NodeType;
  label: string;
  cost: number;
  rows: number;
  table?: string;
  accessType?: AccessType;
  key?: string;
  keyParts?: string[];
  condition?: string;
  extra: string[];
  children: string[];
  isCriticalPath?: boolean;
  rawData: Record<string, unknown>;
}

export type NodeType = 'select' | 'table' | 'join' | 'sort' | 'group' | 'distinct' |
  'union' | 'subquery' | 'temp_table' | 'buffer';

// Color mapping for access types
export const accessTypeColors: Record<AccessType, string> = {
  system: '#10b981',   // green - best
  const: '#10b981',    // green
  eq_ref: '#06b6d4',   // cyan
  ref: '#06b6d4',      // cyan
  fulltext: '#8b5cf6', // purple
  ref_or_null: '#8b5cf6',
  index_merge: '#f59e0b', // amber
  unique_subquery: '#8b5cf6',
  index_subquery: '#8b5cf6',
  range: '#f59e0b',    // amber
  index: '#f59e0b',    // amber - warning
  ALL: '#ef4444',      // red - worst
};
