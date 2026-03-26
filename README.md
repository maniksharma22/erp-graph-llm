# ERP Graph Query System (AI LLM + Graph Visualization)

A production‑ready web application that visualizes an ERP dataset as an interactive graph and lets users query it using natural language. The system dynamically translates questions into structured queries and highlights relevant nodes in the graph, with AI‑generated responses using Groq AI.

## Features
- Interactive graph visualization of ERP entities  
- Natural language to structured query conversion (AI powered)  
- Node highlighting based on user queries  
- Navigation between matched nodes (Previous/Next)  
- Clean, professional UI/UX

##  Tech Stack
- **Frontend:** React.js (deployed on Vercel)  
- **Backend:** Node.js & Express (hosted on Render)  
- **Database:** PostgreSQL
- **AI/LLM:** Groq AI for query understanding and responses  
- **Graph Visualization:** Network/force graph library

## Installation

### Backend

cd backend  
npm install  
node index.js 

### Frontend

cd frontend  
npm install  
npm run dev  

## Live Demo

https://erp-graph-llm.vercel.app/
