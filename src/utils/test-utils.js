// test-utils.js
const logger = require("./src/utils/logger.util");
const ResponseUtil = require("./src/utils/response.util");

async function testUtils() {
  // Test logger
  await logger.info("Test info message");
  await logger.warn("Test warning message");
  await logger.error("Test error message");
  console.log("✅ Logger working");

  // Test response (mock res object)
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log("Response:", { code, data });
        return data;
      },
    }),
  };

  ResponseUtil.success(mockRes, { test: "data" }, "Test success");
  console.log("✅ ResponseUtil working");
}

testUtils();
