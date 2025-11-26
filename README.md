# AI Agent Project

An intelligent AI agent that creates Next.js pages and React components using the ReAct pattern (Reason + Act + Observe).

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
# Edit .env and add your ANTHROPIC_API_KEY
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Use the Application
Open http://localhost:3000 and give instructions like:
- "Create a homepage with a hero section"
- "Create an about page and a Card component"

## Project Structure
```
ai-agent-project/
├── backend/          # Node.js + Express API
│   ├── server.js     # Main agent implementation
│   ├── .env          # API keys (add your key here!)
│   └── output/       # Generated files appear here
└── frontend/         # Next.js UI
    └── app/
        └── page.js   # Main interface
```

## Features
- ✅ ReAct Pattern Implementation
- ✅ Real-time Agent Visualization
- ✅ File Generation (Pages & Components)
- ✅ Beautiful Modern UI
- ✅ Claude API Integration

## Get Your API Key
1. Visit https://console.anthropic.com/
2. Create an account
3. Generate an API key
4. Add it to backend/.env

## Documentation
See individual README files in backend/ and frontend/ directories for more details.
