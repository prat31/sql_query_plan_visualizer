# SQL Query Plan Visualizer

A visually stunning, static web application that transforms raw MySQL `EXPLAIN FORMAT=JSON` output into an intuitive, interactive, and aesthetically pleasing flow chart.

## Features

### Command Center (Input)
- Clean paste area for `EXPLAIN FORMAT=JSON` output
- Auto-validation of JSON on paste
- One-click "Load Demo" to see the visualization immediately

### Flow Visualization
- Interactive graph using ReactFlow to render the query plan as a DAG
- **Node Representation**:
  - Different icons for JOIN, SELECT, SORT, GROUP BY operations
  - Cost heatmap coloring from cool (cyan) to hot (red) based on cost
  - Visual indicators for expensive operations
- **Animated Edges**: Flowing particles to represent data direction and volume

### Deep Dive Details
- Click any node to see detailed stats:
  - Cost, Rows Examined, Key Used, Extra Info
- Automatic "Critical Path" highlighting (most expensive chain)
- Warnings for filesort and temporary table usage

## Tech Stack

- **Framework**: React + TypeScript (Vite)
- **Styling**: Tailwind CSS v4
- **Graph Library**: ReactFlow
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Usage

1. Run a MySQL query with `EXPLAIN FORMAT=JSON`:
   ```sql
   EXPLAIN FORMAT=JSON SELECT * FROM orders o
   JOIN customers c ON o.customer_id = c.id
   WHERE o.created_at > '2024-01-01';
   ```

2. Copy the JSON output

3. Paste it into the visualizer or click "Load Demo" to see an example

4. Explore the flow chart:
   - Zoom and pan to navigate
   - Click nodes for detailed information
   - Look for red nodes (expensive operations) and warning badges

## Understanding the Visualization

### Node Colors
- **Cyan/Green**: Low cost, efficient operations
- **Purple**: Medium cost
- **Amber**: Warning - consider optimization
- **Red**: High cost - needs attention

### Access Types (Best to Worst)
- `system/const`: Best - single row lookup
- `eq_ref/ref`: Good - index lookup
- `range`: OK - index range scan
- `index`: Warning - full index scan
- `ALL`: Bad - full table scan

### Warning Indicators
- "Using filesort" - Consider adding an index for ORDER BY
- "Using temporary" - Query needs temporary table

## License

MIT
