import { describe, it, expect } from 'vitest';
import { parseExplainJSON, validateExplainJSON } from './parser';
import type { MySQLExplainJSON } from '../types';

describe('validateExplainJSON', () => {
  it('should reject invalid JSON', () => {
    const result = validateExplainJSON('not json');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('should reject JSON without query_block', () => {
    const result = validateExplainJSON('{"foo": "bar"}');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('missing query_block');
  });

  it('should accept valid EXPLAIN JSON', () => {
    const validJson = JSON.stringify({
      query_block: {
        select_id: 1,
        table: {
          table_name: 'users',
          access_type: 'ALL',
        },
      },
    });
    const result = validateExplainJSON(validJson);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });
});

describe('parseExplainJSON', () => {
  it('should parse simple single table query', () => {
    const json: MySQLExplainJSON = {
      query_block: {
        select_id: 1,
        cost_info: { query_cost: '10.50' },
        table: {
          table_name: 'users',
          access_type: 'ALL',
          rows_examined_per_scan: 100,
          rows_produced_per_join: 100,
          cost_info: { read_cost: '10.50' },
        },
      },
    };

    const result = parseExplainJSON(json);

    expect(result.nodes.length).toBe(1);
    expect(result.edges.length).toBe(0);
    expect(result.planNodes[0].table).toBe('users');
    expect(result.planNodes[0].accessType).toBe('ALL');
    expect(result.planNodes[0].rows).toBe(100);
  });

  it('should parse nested loop join', () => {
    const json: MySQLExplainJSON = {
      query_block: {
        select_id: 1,
        cost_info: { query_cost: '50.00' },
        nested_loop: [
          {
            table: {
              table_name: 'orders',
              access_type: 'ALL',
              rows_examined_per_scan: 1000,
              cost_info: { read_cost: '25.00' },
            },
          },
          {
            table: {
              table_name: 'customers',
              access_type: 'eq_ref',
              key: 'PRIMARY',
              rows_examined_per_scan: 1,
              cost_info: { read_cost: '25.00' },
            },
          },
        ],
      },
    };

    const result = parseExplainJSON(json);

    // Should have: 1 join node + 2 table nodes
    expect(result.planNodes.length).toBe(3);

    const joinNode = result.planNodes.find(n => n.type === 'join');
    expect(joinNode).toBeDefined();
    expect(joinNode?.label).toBe('Nested Loop Join');

    const tableNodes = result.planNodes.filter(n => n.type === 'table');
    expect(tableNodes.length).toBe(2);

    // Should have edges from tables to join
    expect(result.edges.length).toBe(2);
  });

  it('should parse ORDER BY with filesort', () => {
    const json: MySQLExplainJSON = {
      query_block: {
        select_id: 1,
        ordering_operation: {
          using_filesort: true,
          table: {
            table_name: 'products',
            access_type: 'index',
            rows_examined_per_scan: 500,
          },
        },
      },
    };

    const result = parseExplainJSON(json);

    const sortNode = result.planNodes.find(n => n.type === 'sort');
    expect(sortNode).toBeDefined();
    expect(sortNode?.extra).toContain('Using filesort');

    const tableNode = result.planNodes.find(n => n.type === 'table');
    expect(tableNode?.table).toBe('products');
  });

  it('should parse GROUP BY operation', () => {
    const json: MySQLExplainJSON = {
      query_block: {
        select_id: 1,
        grouping_operation: {
          using_temporary_table: true,
          using_filesort: true,
          table: {
            table_name: 'sales',
            access_type: 'ALL',
            rows_examined_per_scan: 10000,
          },
        },
      },
    };

    const result = parseExplainJSON(json);

    const groupNode = result.planNodes.find(n => n.type === 'group');
    expect(groupNode).toBeDefined();
    expect(groupNode?.extra).toContain('Using temporary table');
    expect(groupNode?.extra).toContain('Using filesort');
  });

  it('should mark critical path correctly', () => {
    const json: MySQLExplainJSON = {
      query_block: {
        select_id: 1,
        nested_loop: [
          {
            table: {
              table_name: 'cheap_table',
              access_type: 'const',
              rows_examined_per_scan: 1,
              cost_info: { read_cost: '1.00' },
            },
          },
          {
            table: {
              table_name: 'expensive_table',
              access_type: 'ALL',
              rows_examined_per_scan: 100000,
              cost_info: { read_cost: '500.00' },
            },
          },
        ],
      },
    };

    const result = parseExplainJSON(json);

    const expensiveNode = result.planNodes.find(n => n.table === 'expensive_table');
    expect(expensiveNode?.isCriticalPath).toBe(true);
  });

  it('should calculate total cost', () => {
    const json: MySQLExplainJSON = {
      query_block: {
        select_id: 1,
        nested_loop: [
          {
            table: {
              table_name: 't1',
              access_type: 'ALL',
              cost_info: { read_cost: '100.00' },
            },
          },
          {
            table: {
              table_name: 't2',
              access_type: 'ref',
              cost_info: { read_cost: '50.00' },
            },
          },
        ],
      },
    };

    const result = parseExplainJSON(json);

    // Total should include join node cost + table costs
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it('should handle table using index', () => {
    const json: MySQLExplainJSON = {
      query_block: {
        select_id: 1,
        table: {
          table_name: 'indexed_table',
          access_type: 'ref',
          key: 'idx_name',
          used_key_parts: ['name'],
          using_index: true,
        },
      },
    };

    const result = parseExplainJSON(json);

    const node = result.planNodes[0];
    expect(node.key).toBe('idx_name');
    expect(node.keyParts).toEqual(['name']);
    expect(node.extra).toContain('Using index');
  });

  it('should handle attached condition', () => {
    const json: MySQLExplainJSON = {
      query_block: {
        select_id: 1,
        table: {
          table_name: 'filtered_table',
          access_type: 'ALL',
          attached_condition: "(`filtered_table`.`status` = 'active')",
        },
      },
    };

    const result = parseExplainJSON(json);

    const node = result.planNodes[0];
    expect(node.condition).toContain('status');
  });
});
