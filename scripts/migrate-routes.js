#!/usr/bin/env node
// scripts/migrate-routes.js - Copies API routes from old server.js to new app.js

const fs = require("fs");
const path = require("path");

console.log("🔀 AI Agent Project - Route Migration Script\n");

const PROJECT_ROOT = path.join(__dirname, "..");

// Read old server.js
function readOldServer() {
  const serverPath = path.join(PROJECT_ROOT, "server.js");

  if (!fs.existsSync(serverPath)) {
    console.error("❌ server.js not found!");
    console.error(
      "   Make sure you have the original server.js in your project root"
    );
    process.exit(1);
  }

  return fs.readFileSync(serverPath, "utf-8");
}

// Extract API routes from server.js
function extractRoutes(serverContent) {
  console.log("🔍 Scanning server.js for API routes...\n");

  const routes = [];

  // Find all app.post, app.get, app.put, app.delete
  const routePatterns = [
    /app\.(post|get|put|delete)\s*\(\s*["']([^"']+)["']\s*,\s*async\s*\(req,\s*res\)\s*=>\s*{/g,
    /app\.(post|get|put|delete)\s*\(\s*["']([^"']+)["']\s*,\s*\(req,\s*res\)\s*=>\s*{/g,
  ];

  let match;
  let startIndex = 0;

  // Simple approach: find each route and extract until matching closing brace
  const lines = serverContent.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts a route
    const routeMatch = line.match(
      /app\.(post|get|put|delete)\s*\(["']([^"']+)["']/
    );

    if (routeMatch) {
      const method = routeMatch[1];
      const path = routeMatch[2];

      // Skip health check (already in new app.js)
      if (path === "/health") {
        console.log(`  ⏭️  Skipping /health (already exists)`);
        continue;
      }

      // Extract the entire route function
      let braceCount = 0;
      let routeCode = "";
      let started = false;

      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];

        // Count braces
        for (const char of currentLine) {
          if (char === "{") {
            braceCount++;
            started = true;
          } else if (char === "}") {
            braceCount--;
          }
        }

        routeCode += currentLine + "\n";

        // Found matching closing brace
        if (started && braceCount === 0) {
          routes.push({
            method,
            path,
            code: routeCode,
            startLine: i + 1,
            endLine: j + 1,
          });

          console.log(
            `  ✅ Found: ${method.toUpperCase()} ${path} (lines ${i + 1}-${
              j + 1
            })`
          );
          i = j; // Skip ahead
          break;
        }
      }
    }
  }

  console.log(`\n📊 Found ${routes.length} API routes\n`);
  return routes;
}

// Update app.js with routes
function updateAppJS(routes) {
  console.log("📝 Updating src/app.js...\n");

  const appPath = path.join(PROJECT_ROOT, "src", "app.js");

  if (!fs.existsSync(appPath)) {
    console.error("❌ src/app.js not found!");
    process.exit(1);
  }

  let appContent = fs.readFileSync(appPath, "utf-8");

  // Find where to insert routes (before error handling)
  const errorHandlerIndex = appContent.indexOf("// Error handling");

  if (errorHandlerIndex === -1) {
    console.error("❌ Could not find error handling section in app.js");
    process.exit(1);
  }

  // Build routes section
  let routesSection = "\n// ========================================\n";
  routesSection += "// API Routes (migrated from server.js)\n";
  routesSection += "// ========================================\n\n";

  // Add require for AIAgent at the top if routes use it
  const needsAgent = routes.some((r) => r.code.includes("agent."));

  if (needsAgent) {
    // Check if AIAgent is already imported
    if (!appContent.includes("AIAgentService")) {
      const lastRequire = appContent.lastIndexOf("require(");
      const lastRequireLine = appContent
        .substring(0, lastRequire)
        .lastIndexOf("\n");

      const agentImport =
        "const AIAgentService = require('./services/agent/AIAgent.service');\n";
      const agentInit = "const agent = new AIAgentService();\n\n";

      appContent =
        appContent.substring(0, lastRequireLine + 1) +
        agentImport +
        agentInit +
        appContent.substring(lastRequireLine + 1);

      console.log("  ✅ Added AIAgent service import");
    }
  }

  // Add each route
  routes.forEach((route) => {
    routesSection += route.code + "\n";
  });

  routesSection += "// ========================================\n\n";

  // Insert routes before error handling
  const beforeError = appContent.substring(0, errorHandlerIndex);
  const afterError = appContent.substring(errorHandlerIndex);

  const newContent = beforeError + routesSection + afterError;

  // Backup existing app.js
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(`${appPath}.backup.${timestamp}`, appContent);
  console.log(`  💾 Backed up app.js to app.js.backup.${timestamp}`);

  // Write new content
  fs.writeFileSync(appPath, newContent);
  console.log("  ✅ Updated src/app.js with API routes\n");
}

// Copy global variables and helper functions
function copyGlobals(serverContent) {
  console.log("📦 Checking for global variables...\n");

  const globals = [];

  // Find let/const at top level (before first class/function)
  const lines = serverContent.split("\n");
  let inGlobal = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("//") || line.startsWith("/*")) continue;

    // Stop at first class or large function
    if (line.startsWith("class ") || line.startsWith("function ")) {
      inGlobal = false;
      break;
    }

    // Look for global variables
    if (
      (line.startsWith("let ") || line.startsWith("const ")) &&
      !line.includes("require(") &&
      !line.includes("express()")
    ) {
      globals.push(line);
      console.log(`  Found: ${line.substring(0, 50)}...`);
    }
  }

  if (globals.length > 0) {
    console.log(`\n  ℹ️  Found ${globals.length} global variables`);
    console.log("  ⚠️  You may need to add these to src/app.js manually:\n");
    globals.forEach((g) => console.log(`     ${g}`));
    console.log("");
  } else {
    console.log("  ✅ No global variables found\n");
  }
}

// Print summary
function printSummary(routes) {
  console.log("═".repeat(60));
  console.log("✅ Route Migration Complete!\n");
  console.log(`📊 Migrated ${routes.length} API routes\n`);

  console.log("Routes added:");
  routes.forEach((route) => {
    console.log(`  • ${route.method.toUpperCase().padEnd(6)} ${route.path}`);
  });

  console.log("\n📋 Next Steps:");
  console.log("  1. Review src/app.js to ensure routes look correct");
  console.log("  2. Check if any global variables need to be added");
  console.log("  3. Restart server: npm run dev");
  console.log("  4. Test all endpoints\n");

  console.log("🧪 Test Commands:");
  console.log("  curl http://localhost:3001/api/status");
  console.log("  curl http://localhost:3001/api/files");
  console.log("  curl -X POST http://localhost:3001/api/execute \\");
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"instruction":"test","mode":"new"}\'\n');

  console.log("═".repeat(60));
}

// Main execution
function main() {
  try {
    const serverContent = readOldServer();

    const routes = extractRoutes(serverContent);

    if (routes.length === 0) {
      console.log("⚠️  No routes found to migrate");
      console.log(
        "   Check if your server.js has app.post() or app.get() routes"
      );
      return;
    }

    copyGlobals(serverContent);
    updateAppJS(routes);
    printSummary(routes);
  } catch (error) {
    console.error("❌ Error during route migration:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

main();
