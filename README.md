# SQL Query Plan Visualizer

> **A visually stunning, static web tool that transforms raw MySQL `EXPLAIN` JSON into interactive, futuristic flow charts.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-7-purple)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-cyan)

## 🚀 Overview

Typical database query plans are dense, text-heavy, and hard to read. **SQL Query Plan Visualizer** turns them into intuitive, directed graphs (DAGs) that let you instantly spot performance bottlenecks.

Built with a "Cyber-Glass" aesthetic, it combines deep dark backgrounds with neon accents to make database optimization feel like exploring a futuristic data map.

## ✨ Features

- **Interactive Graphs**: Powered by [React Flow](https://reactflow.dev/), visualizing the flow of data through your query.
- **Cost Heatmaps**: Nodes change color from **Cool (Low Cost)** to **Hot (Expensive)** based on execution cost.
- **Performance Insights**: Automatically highlights full table scans, temporary table usage, and file sorts.
- **Privacy First**: **100% Static & Client-Side**. Your query plans are parsed locally in your browser and never sent to any server.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Visuals**: [React Flow](https://reactflow.dev/) + [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

## ⚡ Getting Started

### Prerequisites
- Node.js 20+

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/prat31/sql_query_plan_visualizer.git
    cd sql_query_plan_visualizer
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173` in your browser.

## 📖 Usage

1.  Run your MySQL query with `EXPLAIN FORMAT=JSON`:
    ```sql
    EXPLAIN FORMAT=JSON SELECT * FROM users JOIN orders ON users.id = orders.user_id;
    ```
2.  Copy the JSON output.
3.  Paste it into the **SQL Query Plan Visualizer**.
4.  Explore the graph!

## 📦 Deployment

This project is designed to be hosted on **GitHub Pages** (or any static host).
A GitHub Actions workflow is included in `.github/workflows/deploy.yml` which automatically builds and deploys to the `gh-pages` environment on push to `main`.

---

*Created by [Pratyush](https://pratcode.dev)*
