# ERP Graph LLM

## Overview
This project lets you explore ERP business data through an interactive graph. Ask natural language questions about orders, deliveries, invoices, payments, and customers — responses are interpreted using **Groq AI** and relevant graph nodes are visually highlighted.

## Features
- **Interactive Graph:** Visualize relationships between business entities like Orders, Customers, and Products.
- **Conversational Querying:** Natural language questions are translated into structured queries with Groq AI.
- **Node Highlighting:** Results highlight the relevant nodes in the graph for easy understanding.
- **Guardrails:** Queries are restricted to your dataset so unrelated prompts are rejected.

## Tech Stack
- **Frontend:** React.js, ReactFlow  
- **Backend:** Node.js, SQL/Graph Database  
- **AI Integration:** Groq AI

## Demo
Add your live demo link here (optional)

## Setup
1. Clone the repository:  
   ```bash
   git clone https://github.com/maniksharma22/erp-graph-llm.git

Navigate to the project directory:

cd erp-graph-llm

Install dependencies:

npm install

Start the frontend:

npm start

Start the backend:

node index.js