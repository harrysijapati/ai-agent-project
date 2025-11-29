// src/utils/logger.util.js
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
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    console.log(message);
    try {
      await fs.appendFile(this.logFile, logMessage, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async logSection(title, content) {
    const separator = '='.repeat(60);
    await this.log(`\n${separator}`);
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
