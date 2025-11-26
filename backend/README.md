# AI Agent Backend

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your API key in `.env`:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key
   ```

3. Start the server:
   ```bash
   npm start
   ```

The backend will run on http://localhost:3001

## API Endpoints

- POST /api/execute - Execute agent with instruction
- GET /api/files - Get all generated files
