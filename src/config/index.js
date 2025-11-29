// src/config/index.js
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
