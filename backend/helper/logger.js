const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

// Create a logger utility
export class LLMLogger {
  constructor() {
    this.logDir = path.join(__dirname, "logs");
    this.logFile = path.join(this.logDir, "llm.log");
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fsSync.existsSync(this.logDir)) {
      fsSync.mkdirSync(this.logDir, { recursive: true });
    }
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    // Also log to console
    console.log(message);

    // Append to file
    try {
      await fs.appendFile(this.logFile, logMessage, "utf-8");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  async logSection(title, content) {
    const separator = "=".repeat(60);
    await this.log(`\n${separator}`);
    await this.log(title);
    await this.log(separator);
    await this.log(content);
    await this.log(separator);
  }

  async logJSON(title, data) {
    await this.logSection(title, JSON.stringify(data, null, 2));
  }
}
