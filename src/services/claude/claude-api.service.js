// src/services/claude/claude-api.service.js
const config = require("../../config");
const logger = require("../../utils/logger.util");

class ClaudeAPIService {
  constructor() {
    this.apiKey = config.api.anthropicKey;
    this.model = config.agent.modelName;
    this.maxTokens = config.agent.maxTokens;
  }

  async sendMessage(messages, systemPrompt = null) {
    try {
      const requestBody = {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: messages,
      };

      if (systemPrompt) {
        requestBody.system = systemPrompt;
      }

      await logger.debug("Sending request to Claude API");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`Claude API Error: ${data.error.message}`);
      }

      await logger.debug("Received response from Claude API");
      return data;
    } catch (error) {
      await logger.error(`Claude API request failed: ${error.message}`);
      throw error;
    }
  }

  extractTextContent(response) {
    if (!response.content || response.content.length === 0) {
      return "";
    }

    return response.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
  }
}

module.exports = ClaudeAPIService;
