// src/server.js
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger.util');

const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info(`Environment: ${config.server.env}`);
  logger.info(`API Key configured: ${config.api.anthropicKey ? 'Yes' : 'No'}`);
});
