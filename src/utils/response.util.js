// src/utils/response.util.js
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
