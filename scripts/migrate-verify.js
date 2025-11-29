#!/usr/bin/env node
// scripts/migrate-verify.js - Verifies migration is complete and working

const fs = require("fs");
const path = require("path");
const http = require("http");

console.log("🔍 AI Agent Project Migration - Verification Script\n");

let passed = 0;
let failed = 0;

function pass(message) {
  console.log(`  ✅ ${message}`);
  passed++;
}

function fail(message) {
  console.log(`  ❌ ${message}`);
  failed++;
}

// Check file exists
function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (fs.existsSync(fullPath)) {
    pass(`${description} exists`);
    return true;
  } else {
    fail(`${description} missing: ${filePath}`);
    return false;
  }
}

// Check directory exists
function checkDir(dirPath, description) {
  const fullPath = path.join(__dirname, "..", dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    pass(`${description} exists`);
    return true;
  } else {
    fail(`${description} missing: ${dirPath}`);
    return false;
  }
}

// Check file contains text
function checkFileContains(filePath, searchText, description) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    if (content.includes(searchText)) {
      pass(description);
      return true;
    } else {
      fail(`${description} - text not found`);
      return false;
    }
  } else {
    fail(`${description} - file not found`);
    return false;
  }
}

// Test HTTP endpoint
function testEndpoint(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        if (res.statusCode === expectedStatus) {
          pass(`Endpoint ${url} responding (${res.statusCode})`);
          resolve(true);
        } else {
          fail(`Endpoint ${url} wrong status (${res.statusCode})`);
          resolve(false);
        }
      })
      .on("error", (err) => {
        fail(`Endpoint ${url} not accessible: ${err.message}`);
        resolve(false);
      });
  });
}

// Phase 1: Check structure
async function checkStructure() {
  console.log("📁 Phase 1: Checking Structure\n");

  checkDir("src", "src directory");
  checkDir("src/config", "config directory");
  checkDir("src/controllers", "controllers directory");
  checkDir("src/routes", "routes directory");
  checkDir("src/services", "services directory");
  checkDir("src/services/agent", "agent services directory");
  checkDir("src/middlewares", "middlewares directory");
  checkDir("src/utils", "utils directory");
  checkDir("tests", "tests directory");

  console.log("");
}

// Phase 2: Check config files
async function checkConfig() {
  console.log("⚙️  Phase 2: Checking Configuration\n");

  checkFile("src/config/index.js", "Main config");
  checkFile("src/config/constants.js", "Constants");
  checkFile(".env.example", ".env.example");

  // Check config exports correctly
  try {
    const config = require(path.join(__dirname, "..", "src", "config"));
    if (config.server && config.api && config.agent) {
      pass("Config structure valid");
    } else {
      fail("Config structure incomplete");
    }
  } catch (error) {
    fail(`Config loading error: ${error.message}`);
  }

  console.log("");
}

// Phase 3: Check utilities
async function checkUtils() {
  console.log("🔧 Phase 3: Checking Utilities\n");

  checkFile("src/utils/logger.util.js", "Logger utility");
  checkFile("src/utils/response.util.js", "Response utility");

  // Try to load utilities
  try {
    const logger = require(path.join(
      __dirname,
      "..",
      "src",
      "utils",
      "logger.util"
    ));
    if (logger.info && logger.error && logger.warn) {
      pass("Logger exports correctly");
    } else {
      fail("Logger methods missing");
    }
  } catch (error) {
    fail(`Logger loading error: ${error.message}`);
  }

  try {
    const ResponseUtil = require(path.join(
      __dirname,
      "..",
      "src",
      "utils",
      "response.util"
    ));
    if (ResponseUtil.success && ResponseUtil.error) {
      pass("ResponseUtil exports correctly");
    } else {
      fail("ResponseUtil methods missing");
    }
  } catch (error) {
    fail(`ResponseUtil loading error: ${error.message}`);
  }

  console.log("");
}

// Phase 4: Check services
async function checkServices() {
  console.log("🎯 Phase 4: Checking Services\n");

  checkFile("src/services/agent/AIAgent.service.js", "AIAgent service");

  // Check if AIAgent has been copied from server.js
  checkFileContains(
    "src/services/agent/AIAgent.service.js",
    "execute",
    "AIAgent has execute method"
  );

  // Check if it's still a stub
  const stubPath = path.join(
    __dirname,
    "..",
    "src",
    "services",
    "agent",
    "AIAgent.service.js"
  );
  if (fs.existsSync(stubPath)) {
    const content = fs.readFileSync(stubPath, "utf-8");
    if (content.includes("TODO: Copy methods")) {
      fail("AIAgent service is still a stub - needs implementation");
    } else {
      pass("AIAgent service has been implemented");
    }
  }

  console.log("");
}

// Phase 5: Check entry points
async function checkEntryPoints() {
  console.log("🚀 Phase 5: Checking Entry Points\n");

  checkFile("src/app.js", "Express app");
  checkFile("src/server.js", "Server entry point");

  // Try to load app
  try {
    const app = require(path.join(__dirname, "..", "src", "app"));
    if (typeof app === "function" || (app && app._router)) {
      pass("Express app loads correctly");
    } else {
      fail("Express app structure invalid");
    }
  } catch (error) {
    fail(`App loading error: ${error.message}`);
  }

  console.log("");
}

// Phase 6: Check package.json
async function checkPackage() {
  console.log("📦 Phase 6: Checking package.json\n");

  const packagePath = path.join(__dirname, "..", "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    if (
      pkg.scripts &&
      pkg.scripts.dev &&
      pkg.scripts.dev.includes("src/server.js")
    ) {
      pass("package.json dev script updated");
    } else {
      fail("package.json dev script not updated");
    }

    if (
      pkg.scripts &&
      pkg.scripts.start &&
      pkg.scripts.start.includes("src/server.js")
    ) {
      pass("package.json start script updated");
    } else {
      fail("package.json start script not updated");
    }
  } else {
    fail("package.json not found");
  }

  console.log("");
}

// Phase 7: Check server is running
async function checkServer() {
  console.log("🌐 Phase 7: Checking Server (if running)\n");

  console.log("  ℹ️  Note: Server must be running for these tests");
  console.log("  ℹ️  Run: npm run dev in another terminal\n");

  await testEndpoint("http://localhost:3001/health");
  await testEndpoint("http://localhost:3001/api/status");

  console.log("");
}

// Phase 8: Check original files
async function checkBackups() {
  console.log("💾 Phase 8: Checking Backups\n");

  const files = fs.readdirSync(path.join(__dirname, ".."));
  const backups = files.filter((f) => f.includes(".backup."));

  if (backups.length > 0) {
    pass(`Found ${backups.length} backup file(s)`);
    backups.forEach((b) => console.log(`    📁 ${b}`));
  } else {
    fail("No backup files found");
  }

  console.log("");
}

// Print summary
function printSummary() {
  console.log("═".repeat(60));
  console.log("📊 Verification Summary\n");
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(
    `  📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
  );
  console.log("═".repeat(60));
  console.log("");

  if (failed === 0) {
    console.log("🎉 All checks passed! Migration successful!");
    console.log("");
    console.log("✅ Next Steps:");
    console.log("  1. Start server: npm run dev");
    console.log("  2. Test endpoints manually");
    console.log("  3. Remove old server.js when confident");
    console.log("  4. Update documentation");
    console.log("");
  } else {
    console.log("⚠️  Some checks failed. Review the output above.");
    console.log("");
    console.log("🔧 Common Fixes:");
    console.log("  - Copy AIAgent class from server.js to service");
    console.log("  - Update require() paths");
    console.log("  - Check .env file exists");
    console.log("  - Run: npm install");
    console.log("");
    console.log("📚 See MIGRATION_INSTRUCTIONS.md for details");
    console.log("");
  }
}

// Main execution
async function main() {
  try {
    await checkStructure();
    await checkConfig();
    await checkUtils();
    await checkServices();
    await checkEntryPoints();
    await checkPackage();
    await checkServer();
    await checkBackups();
    printSummary();

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Verification error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

main();
