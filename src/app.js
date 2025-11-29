// src/app.js
const express = require("express");
const cors = require("cors");
const config = require("./config");
const AIAgentService = require("./services/agent/AIAgent.service");
const agent = new AIAgentService();
const path = require("path");
const fs = require("fs").promises;
const logger = require("./utils/logger.util");
const utils = require("./utils/file.util");
const llmLogger = logger; // Add this line
const { exec, spawn } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

// ADD THESE GLOBAL VARIABLES HERE:
let nextJsProcess = null;
let errorBuffer = [];

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ========================================
// API Routes (migrated from server.js)
// ========================================

app.post("/api/execute", async (req, res) => {
  try {
    const {
      instruction,
      mode = "new",
      confirmed = false,
      iterationCount = 0,
    } = req.body;

    if (!instruction) {
      return res.status(400).json({ error: "Instruction is required" });
    }

    await llmLogger.log(
      `\n📨 API REQUEST: mode=${mode}, confirmed=${confirmed}, iterationCount=${iterationCount}`
    );

    // Execute the agent with confirmed parameter
    const result = await agent.execute(
      instruction,
      mode,
      iterationCount,
      false,
      confirmed
    );
    res.json(result);
  } catch (error) {
    console.error("Error executing agent:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auto-fix", async (req, res) => {
  try {
    await llmLogger.log("\n🔧 AUTO-FIX TRIGGERED");

    // Analyze errors
    const context = await agent.analyzeContext();

    if (
      !context ||
      !context.errors ||
      Object.values(context.errors).every((arr) => arr.length === 0)
    ) {
      return res.json({
        success: true,
        message: "No errors detected",
        needsFix: false,
      });
    }

    // Generate fix instruction
    const errorSummary = `Fix the following errors:
- Missing imports: ${context.errors.missingImports.join(", ")}
- Missing components: ${context.errors.missingComponents.length} issues
- Build errors: ${context.errors.buildErrors.length} issues`;

    await llmLogger.log("Generated error summary: " + errorSummary);

    // Execute in auto-fix mode
    const result = await agent.execute(errorSummary, "iterate", 0, true);

    res.json({
      success: true,
      fixed: true,
      result: result,
    });
  } catch (error) {
    console.error("Error in auto-fix:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/errors", async (req, res) => {
  try {
    const errors = await agent.analyzeErrors();
    res.json({
      errors: errors || {},
      hasErrors: errors
        ? Object.values(errors).some((arr) => arr.length > 0)
        : false,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/files", async (req, res) => {
  try {
    const outputDir = path.join(
      __dirname,
      "services/agent/output",
      "nextjs-project"
    );
    const files = await utils.getFilesRecursively(outputDir);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/install", async (req, res) => {
  try {
    const projectDir = path.join(
      __dirname,
      "services/agent/output",
      "nextjs-project"
    );

    try {
      await fs.access(projectDir);
    } catch {
      return res
        .status(404)
        .json({ error: "Project not found. Please generate files first." });
    }

    console.log("📦 Installing dependencies...");
    const { stdout } = await execPromise("npm install", {
      cwd: projectDir,
      timeout: 120000,
    });

    console.log("✅ Dependencies installed");
    res.json({
      success: true,
      message: "Dependencies installed successfully",
      output: stdout,
    });
  } catch (error) {
    console.error("❌ Install error:", error);
    res.status(500).json({
      error: error.message,
      details: error.stderr || error.stdout,
    });
  }
});

app.post("/api/run", async (req, res) => {
  try {
    const projectDir = path.join(
      __dirname,
      "services/agent/output",
      "nextjs-project"
    );

    if (nextJsProcess) {
      return res.json({
        success: true,
        message: "Next.js server is already running",
        url: "http://localhost:3002",
      });
    }

    try {
      await fs.access(projectDir);
    } catch {
      return res
        .status(404)
        .json({ error: "Project not found. Please generate files first." });
    }

    try {
      await fs.access(path.join(projectDir, "node_modules"));
    } catch {
      return res.status(400).json({
        error: "Dependencies not installed. Please install dependencies first.",
      });
    }

    console.log("🚀 Starting Next.js server...");

    // Clear error buffer before starting
    errorBuffer = [];

    nextJsProcess = spawn("npm", ["run", "dev", "--", "-p", "3002"], {
      cwd: projectDir,
      stdio: "pipe",
      shell: true,
    });

    // Capture stdout
    nextJsProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(output);

      // Check for compilation success
      if (
        output.includes("compiled successfully") ||
        output.includes("Ready in")
      ) {
        console.log("✅ Next.js compiled successfully");
      }
    });

    // Capture stderr and store errors
    nextJsProcess.stderr.on("data", (data) => {
      const error = data.toString();
      console.error("Next.js stderr:", error);

      // Store errors for analysis
      if (
        error.includes("Error:") ||
        error.includes("Module not found") ||
        error.includes("Failed to compile") ||
        error.includes("Cannot find module")
      ) {
        errorBuffer.push(error);
        console.log("❌ Error detected and stored for analysis");
      }
    });

    nextJsProcess.on("close", (code) => {
      console.log(`Next.js process exited with code ${code}`);
      if (code !== 0) {
        errorBuffer.push(`Process exited with code ${code}`);
      }
      nextJsProcess = null;
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    res.json({
      success: true,
      message: "Next.js server started on port 3002",
      url: "http://localhost:3002",
    });
  } catch (error) {
    console.error("❌ Run error:", error);
    errorBuffer.push(error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/stop", async (req, res) => {
  try {
    if (!nextJsProcess) {
      return res.json({
        success: true,
        message: "Next.js server is not running",
      });
    }

    console.log("🛑 Stopping Next.js server...");
    nextJsProcess.kill("SIGTERM");
    nextJsProcess = null;

    res.json({
      success: true,
      message: "Next.js server stopped",
    });
  } catch (error) {
    console.error("❌ Stop error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    running: nextJsProcess !== null,
    url: nextJsProcess ? "http://localhost:3002" : null,
    hasErrors: errorBuffer.length > 0,
    errorCount: errorBuffer.length,
  });
});

// Get file content
app.get("/api/file/:path(*)", async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "services/agent/output",
      "nextjs-project",
      req.params.path
    );
    const content = await fs.readFile(filePath, "utf-8");
    res.json({ content, path: req.params.path });
  } catch (error) {
    res.status(404).json({ error: "File not found" });
  }
});

// Update file content
app.put("/api/file/:path(*)", async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "services/agent/output",
      "nextjs-project",
      req.params.path
    );
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    await fs.writeFile(filePath, content, "utf-8");
    res.json({ success: true, message: "File updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
app.delete("/api/file/:path(*)", async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "services/agent/output",
      "nextjs-project",
      req.params.path
    );
    await fs.unlink(filePath);
    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/project-tree", async (req, res) => {
  try {
    const projectDir = path.join(
      __dirname,
      "services/agent/output",
      "nextjs-project"
    );
    console.log("📂 Generating project tree...", projectDir);

    const buildTree = async (dir, basePath = "") => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const tree = [];

      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;

        const relativePath = path.join(basePath, entry.name);
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          tree.push({
            name: entry.name,
            type: "directory",
            path: relativePath,
            children: await buildTree(fullPath, relativePath),
          });
        } else {
          tree.push({
            name: entry.name,
            type: "file",
            path: relativePath,
          });
        }
      }

      return tree;
    };

    const tree = await buildTree(projectDir);
    res.json({ tree });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/deploy", async (req, res) => {
  try {
    const projectDir = path.join(
      __dirname,
      "services/agent/output",
      "nextjs-project"
    );
    const { vercelToken, projectName } = req.body;

    if (!vercelToken) {
      return res.status(400).json({
        error:
          "Vercel token is required. Get it from https://vercel.com/account/tokens",
      });
    }

    console.log("🚀 Deploying to Vercel...");

    // Create .vercelignore if it doesn't exist
    const vercelIgnore = `node_modules
.next
.env*.local`;
    await fs.writeFile(
      path.join(projectDir, ".vercelignore"),
      vercelIgnore,
      "utf-8"
    );

    // Install Vercel CLI locally if not present
    try {
      await execPromise("npx vercel --version", { cwd: projectDir });
    } catch {
      console.log("Installing Vercel CLI...");
      await execPromise("npm install -g vercel", { timeout: 60000 });
    }

    // Deploy using Vercel CLI
    const deployCommand = projectName
      ? `vercel --token ${vercelToken} --yes --name ${projectName}`
      : `vercel --token ${vercelToken} --yes`;

    const { stdout, stderr } = await execPromise(deployCommand, {
      cwd: projectDir,
      timeout: 180000, // 3 minutes
      env: { ...process.env, VERCEL_ORG_ID: "", VERCEL_PROJECT_ID: "" },
    });

    // Extract deployment URL from output
    const urlMatch = stdout.match(/https:\/\/[^\s]+/);
    const deploymentUrl = urlMatch ? urlMatch[0] : null;

    console.log("✅ Deployed successfully:", deploymentUrl);

    res.json({
      success: true,
      message: "Deployed to Vercel successfully!",
      url: deploymentUrl,
      output: stdout,
    });
  } catch (error) {
    console.error("❌ Deploy error:", error);
    res.status(500).json({
      error: error.message,
      details: error.stderr || error.stdout,
    });
  }
});

// TODO: Add your routes here
// Copy all app.post() and app.get() from server.js

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    success: false,
    message: err.message,
    ...(config.server.env === "development" && { stack: err.stack }),
  });
});

module.exports = app;
