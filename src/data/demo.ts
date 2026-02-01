import type { MySQLExplainJSON } from '../types';

export const demoExplainJSON: MySQLExplainJSON = {
  "query_block": {
    "select_id": 1,
    "cost_info": {
      "query_cost": "1247.65"
    },
    "ordering_operation": {
      "using_filesort": true,
      "cost_info": {
        "sort_cost": "100.00"
      },
      "grouping_operation": {
        "using_temporary_table": true,
        "using_filesort": false,
        "nested_loop": [
          {
            "table": {
              "table_name": "orders",
              "access_type": "ALL",
              "rows_examined_per_scan": 10000,
              "rows_produced_per_join": 10000,
              "filtered": "100.00",
              "cost_info": {
                "read_cost": "250.00",
                "eval_cost": "100.00",
                "prefix_cost": "350.00",
                "data_read_per_join": "2M"
              },
              "used_columns": [
                "order_id",
                "customer_id",
                "order_date",
                "total_amount"
              ],
              "attached_condition": "(`orders`.`order_date` >= '2024-01-01')"
            }
          },
          {
            "table": {
              "table_name": "customers",
              "access_type": "eq_ref",
              "possible_keys": [
                "PRIMARY"
              ],
              "key": "PRIMARY",
              "used_key_parts": [
                "customer_id"
              ],
              "key_length": "4",
              "ref": [
                "orders.customer_id"
              ],
              "rows_examined_per_scan": 1,
              "rows_produced_per_join": 10000,
              "filtered": "100.00",
              "cost_info": {
                "read_cost": "250.00",
                "eval_cost": "100.00",
                "prefix_cost": "700.00",
                "data_read_per_join": "4M"
              },
              "used_columns": [
                "customer_id",
                "name",
                "email",
                "created_at"
              ],
              "using_index": true
            }
          },
          {
            "table": {
              "table_name": "order_items",
              "access_type": "ref",
              "possible_keys": [
                "idx_order_id"
              ],
              "key": "idx_order_id",
              "used_key_parts": [
                "order_id"
              ],
              "key_length": "4",
              "ref": [
                "orders.order_id"
              ],
              "rows_examined_per_scan": 5,
              "rows_produced_per_join": 50000,
              "filtered": "100.00",
              "cost_info": {
                "read_cost": "125.00",
                "eval_cost": "500.00",
                "prefix_cost": "1147.65",
                "data_read_per_join": "12M"
              },
              "used_columns": [
                "item_id",
                "order_id",
                "product_id",
                "quantity",
                "unit_price"
              ]
            }
          }
        ]
      }
    }
  }
};

export const simpleExplainJSON: MySQLExplainJSON = {
  "query_block": {
    "select_id": 1,
    "cost_info": {
      "query_cost": "25.50"
    },
    "table": {
      "table_name": "users",
      "access_type": "range",
      "possible_keys": [
        "idx_created_at"
      ],
      "key": "idx_created_at",
      "used_key_parts": [
        "created_at"
      ],
      "key_length": "5",
      "rows_examined_per_scan": 100,
      "rows_produced_per_join": 100,
      "filtered": "100.00",
      "cost_info": {
        "read_cost": "15.00",
        "eval_cost": "10.50",
        "prefix_cost": "25.50",
        "data_read_per_join": "50K"
      },
      "used_columns": [
        "id",
        "name",
        "email",
        "created_at"
      ],
      "attached_condition": "(`users`.`created_at` > '2024-01-01')",
      "using_index": true
    }
  }
};
