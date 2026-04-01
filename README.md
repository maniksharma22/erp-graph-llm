# ERP Graph Query System (AI LLM + Graph Visualization)

A production‑ready web application that visualizes an ERP dataset as an interactive graph and lets users query it using natural language. The system dynamically translates questions into structured queries and highlights relevant nodes in the graph, with AI‑generated responses using Groq AI

## 🔗Live Demo:

https://erp-graph-llm.vercel.app/

## Features
- **Interactive ERP Graph:** Visualize connected ERP data in an easy-to-understand graph
- **Ask in Plain English:** Query your data naturally using AI-powered responses
- **Smart Data Grouping:** Combines related records into meaningful business entities
- **End-to-End Flow Tracking:** Trace complete order lifecycle from sales to accounting
- **Query-Based Highlighting:** Automatically highlights relevant nodes based on user queries
- **Cross-Module Insights:** Connects data across different ERP modules seamlessly
- **Mini Graph Navigation:** Includes a MiniMap for quick navigation across large graphs
- **Clean UI:** Simple, fast, and user-friendly interface for better analysis

## How it Works
The system follows a seamless data flow to transform natural language into visual insights:
1. **User Query:** User asks a question in plain English (e.g., "Show me all orders from last month")
2. **AI Processing:** Groq AI (Llama 3.3) translates the English query into a structured SQL command
3. **Data Retrieval:** The system executes the SQL query against the PostgreSQL database
4. **Graph Rendering:** ReactFlow dynamically updates the graph, highlighting relevant nodes and connections
  
## Tech Stack
- **Frontend:** `React.js` (Deployed on Vercel)
- **Backend:** `Node.js` and `Express.js` (Hosted on Render)
- **Database:** `PostgreSQL` (Relational Data Storage)
- **AI Engine:** `Groq AI SDK`(Llama 3.3 for SQL Generation and Natural Language Processing)
- **Layout Engine:** `Dagre` (Hierarchical Directed Graph with LR Flow)
- **Graph Visualization:** `Reactflow` (Dynamic Node and Edge Rendering)
- **Environment Management:** `Dotenv` for secure API and DB credential handling
  
## Performance & Optimization
- **Optimized AI Prompts:** Controls data size to stay within limits and keep responses fast
- **Efficient Queries:** Uses filters and limits to avoid slow loading and heavy data
- **Stable Performance:** Handles API limits smoothly for consistent results
- **Smart Layout:** Uses Dagre to organize graph neatly even with large data

# Installation

# Backend Setup
cd backend
npm install

# Create .env file and add:
# DATABASE_URL=your_database_url
# GROQ_API_KEY=your_groq_api_key

node index.js


# Frontend Setup
cd ../frontend
npm install

# Create .env file and add:
# VITE_API_BASE_URL=your_backend_url

npm run dev

