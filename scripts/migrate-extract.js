#!/usr/bin/env node
// scripts/migrate-extract.js - Extracts code from server.js into new files

const fs = require("fs");
const path = require("path");

console.log("🔧 AI Agent Project Migration - Extract Script\n");

// Write file with directory creation
function writeFile(relativePath, content) {
  const fullPath = path.join(__dirname, "..", relativePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content);
  console.log(`  ✅ Created: ${relativePath}`);
}

// Extract configuration
function extractConfig() {
  console.log("📝 Extracting configuration files...");

  const configIndex = `// src/config/index.js
require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
  },
  api: {
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
  },
  paths: {
    output: './output',
    logs: './logs',
    knowledgeBase: './knowledge-base',
    rag: './rag',
  },
  nextjs: {
    port: 3002,
    version: '14.0.4',
  },
  agent: {
    maxIterations: 10,
    modelName: 'claude-sonnet-4-20250514',
    maxTokens: 4000,
  },
  deployment: {
    timeout: 180000,
  },
  kb: {
    enabled: true,
  },
  rag: {
    enabled: true,
    maxResults: 5,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logFile: './logs/llm.log',
  },
};

if (!config.api.anthropicKey) {
  console.warn('⚠️  Warning: ANTHROPIC_API_KEY not set');
}

module.exports = config;
`;

  const constants = `// src/config/constants.js

module.exports = {
  MODES: {
    NEW: 'new',
    ITERATE: 'iterate',
  },
  TOOLS: {
    CREATE_PAGE: 'createPage',
    CREATE_COMPONENT: 'createComponent',
    UPDATE_PAGE: 'updatePage',
    FIX_ERROR: 'fixError',
  },
  HISTORY_TYPES: {
    USER_INSTRUCTION: 'user_instruction',
    REASON: 'reason',
    ACT: 'act',
    OBSERVE: 'observe',
    COMPLETE: 'complete',
  },
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
  },
};
`;

  writeFile("src/config/index.js", configIndex);
  writeFile("src/config/constants.js", constants);
  console.log("");
}

// Extract utilities
function extractUtils() {
  console.log("🔧 Extracting utility files...");

  const logger = `// src/utils/logger.util.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const config = require('../config');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../', config.paths.logs);
    this.logFile = path.join(this.logDir, 'llm.log');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fsSync.existsSync(this.logDir)) {
      fsSync.mkdirSync(this.logDir, { recursive: true });
    }
  }

  async log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = \`[\${timestamp}] [\${level.toUpperCase()}] \${message}\\n\`;
    console.log(message);
    try {
      await fs.appendFile(this.logFile, logMessage, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async logSection(title, content) {
    const separator = '='.repeat(60);
    await this.log(\`\\n\${separator}\`);
    await this.log(title);
    await this.log(separator);
    await this.log(content);
    await this.log(separator);
  }

  async logJSON(title, data) {
    await this.logSection(title, JSON.stringify(data, null, 2));
  }

  async info(message) { await this.log(message, 'info'); }
  async warn(message) { await this.log(message, 'warn'); }
  async error(message) { await this.log(message, 'error'); }
  async debug(message) {
    if (config.server.env === 'development') {
      await this.log(message, 'debug');
    }
  }
}

const logger = new Logger();
module.exports = logger;
`;

  const response = `// src/utils/response.util.js
const { HTTP_STATUS } = require('../config/constants');

class ResponseUtil {
  static success(res, data = {}, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(res, message = 'Error', statusCode = HTTP_STATUS.INTERNAL_ERROR, details = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    });
  }

  static agentResponse(res, result) {
    if (result.needsConfirmation) {
      return this.success(res, {
        needsConfirmation: true,
        plan: result.plan,
        mode: result.mode,
        instruction: result.instruction,
        context: result.context,
        iterationCount: result.iterationCount,
      });
    }
    if (result.success) {
      return this.success(res, {
        history: result.history,
        iterations: result.iterations,
        mode: result.mode,
      });
    }
    return this.error(res, result.error || 'Execution failed');
  }
}

module.exports = ResponseUtil;
`;

  writeFile("src/utils/logger.util.js", logger);
  writeFile("src/utils/response.util.js", response);
  console.log("");
}

// Create service stub
function createServiceStub() {
  console.log("🎯 Creating service stub...");

  const stub = `// src/services/agent/AIAgent.service.js
// TODO: Copy your AIAgent class here from server.js

const logger = require('../../utils/logger.util');
const config = require('../../config');

class AIAgentService {
  constructor() {
    this.maxIterations = config.agent.maxIterations;
    logger.info('AI Agent Service initialized');
  }

  // TODO: Copy ALL methods from your AIAgent class in server.js:
  // - execute()
  // - reason()
  // - act()
  // - analyzeContext()
  // - createPage()
  // - createComponent()
  // - etc.
}

module.exports = AIAgentService;
`;

  writeFile("src/services/agent/AIAgent.service.js", stub);
  console.log("");
}

// Create app.js
function createApp() {
  console.log("🌐 Creating Express app...");

  const app = `// src/app.js
const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger.util');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(\`\${req.method} \${req.path}\`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Add your routes here
// Copy all app.post() and app.get() from server.js

// Error handling
app.use((err, req, res, next) => {
  logger.error(\`Error: \${err.message}\`);
  res.status(500).json({
    success: false,
    message: err.message,
    ...(config.server.env === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
`;

  writeFile("src/app.js", app);
  console.log("");
}

// Create server.js
function createServer() {
  console.log("🚀 Creating server entry point...");

  const server = `// src/server.js
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger.util');

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(\`✅ Server running on port \${PORT}\`);
  logger.info(\`Environment: \${config.server.env}\`);
  logger.info(\`API Key configured: \${config.api.anthropicKey ? 'Yes' : 'No'}\`);
});
`;

  writeFile("src/server.js", server);
  console.log("");
}

// Print next steps
function printNextSteps() {
  console.log("✅ Extraction Complete!\n");
  console.log("📚 Next Steps:");
  console.log(
    "  1. Copy AIAgent class from server.js to src/services/agent/AIAgent.service.js"
  );
  console.log("  2. Copy all API routes from server.js to src/app.js");
  console.log("  3. Test basic server: npm run dev");
  console.log("  4. Visit: http://localhost:3001/health\n");
}

// Main execution
function main() {
  try {
    extractConfig();
    extractUtils();
    createServiceStub();
    createApp();
    createServer();
    printNextSteps();
  } catch (error) {
    console.error("❌ Error during extraction:", error.message);
    process.exit(1);
  }
}

main();
