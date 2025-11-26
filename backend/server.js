const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { exec, spawn } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

let nextJsProcess = null;

// Logger utility
class LLMLogger {
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

    console.log(message);

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

const llmLogger = new LLMLogger();

// AI Agent Class implementing ReAct pattern
class AIAgent {
  constructor() {
    this.tools = {
      createPage: this.createPage.bind(this),
      createComponent: this.createComponent.bind(this),
    };
    this.maxIterations = 5;
  }

  // Main agent loop
  async execute(userInstruction) {
    const history = [];
    let iteration = 0;

    await llmLogger.log("\n🚀 EXECUTE METHOD CALLED");
    await llmLogger.log(`User Instruction: ${userInstruction}`);

    // Initialize Next.js project first
    await llmLogger.log("🏗️  Initializing Next.js project...");
    const initResult = await this.initializeNextProject();
    if (initResult.error) {
      await llmLogger.log(`❌ Failed to initialize: ${initResult.error}`);
      return {
        success: false,
        error: "Failed to initialize Next.js project: " + initResult.error,
        history,
      };
    }
    await llmLogger.log("✅ Next.js project initialized");

    history.push({
      type: "user_instruction",
      content: userInstruction,
    });

    while (iteration < this.maxIterations) {
      iteration++;
      await llmLogger.log(`\n======== ITERATION ${iteration} ========`);

      // REASON: Generate reasoning and determine action
      await llmLogger.log("🤔 REASONING...");
      const reasoning = await this.reason(userInstruction, history);

      await llmLogger.log(`Thought: ${reasoning.thought}`);
      await llmLogger.log(`Action: ${reasoning.action}`);

      history.push({
        type: "reason",
        content: reasoning.thought,
        iteration,
      });

      // Check if task is complete
      if (reasoning.action === "finish") {
        await llmLogger.log("✅ Task marked as complete");
        history.push({
          type: "complete",
          content: reasoning.finalAnswer,
          iteration,
        });
        break;
      }

      // ACT: Execute the tool
      await llmLogger.log(`🔧 ACTING: Executing tool '${reasoning.action}'`);
      const action = {
        type: "act",
        tool: reasoning.action,
        params: reasoning.params,
        iteration,
      };
      history.push(action);

      // Execute tool and get result
      const observation = await this.act(reasoning.action, reasoning.params);
      await llmLogger.logJSON("Action Result", observation);

      // OBSERVE: Record the result
      history.push({
        type: "observe",
        content: observation,
        iteration,
      });

      // If there's an error, break
      if (observation.error) {
        await llmLogger.log(`❌ Error in observation: ${observation.error}`);
        break;
      }
    }

    await llmLogger.log(
      `\n✅ EXECUTE COMPLETE - Total iterations: ${iteration}`
    );

    return {
      success: true,
      history,
      iterations: iteration,
    };
  }

  // REASON: Use Claude API to determine next action
  async reason(userInstruction, history) {
    await llmLogger.log("\n🤔 REASON METHOD CALLED");

    const prompt = this.buildReActPrompt(userInstruction, history);
    await llmLogger.logSection("📤 PROMPT TO CLAUDE", prompt);

    try {
      const requestBody = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      };

      await llmLogger.logJSON("📤 API REQUEST", requestBody);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      await llmLogger.logJSON("📥 API RESPONSE", data);

      if (data.error) {
        await llmLogger.log(
          `❌ Claude API error: ${JSON.stringify(data.error)}`
        );
        return {
          thought: "Error occurred while reasoning",
          action: "finish",
          finalAnswer: "API Error: " + data.error.message,
        };
      }

      const content = data.content[0].text;
      await llmLogger.logSection("📝 CLAUDE'S TEXT RESPONSE", content);

      // Parse the ReAct response
      const parsed = this.parseReActResponse(content);
      await llmLogger.logJSON("✅ PARSED RESULT", parsed);

      return parsed;
    } catch (error) {
      await llmLogger.log(`❌ ERROR IN REASON METHOD: ${error.message}`);
      return {
        thought: "Error occurred while reasoning",
        action: "finish",
        finalAnswer: "An error occurred: " + error.message,
      };
    }
  }

  // Build ReAct prompt with conversation history
  buildReActPrompt(userInstruction, history) {
    let prompt = `You are an AI agent that creates Next.js 14 pages (using App Router) and React components based on user instructions.

Available Tools:
1. createPage(name, content) - Creates a new Next.js page in the App Router structure
   - name: string 
     * Use "home" or "/" for the main landing page (this REPLACES app/page.js)
     * Use "about", "contact", "products", etc. for other pages (creates app/[name]/page.js)
   - content: string (the full React component code)

2. createComponent(name, content) - Creates a reusable React component
   - name: string (component name like "Button", "Card", "Header", etc.)
   - content: string (the full React component code)
   - This creates: components/[name].js

IMPORTANT - Next.js 14 App Router Guidelines:
- ALWAYS create the home page FIRST using name="home" - this replaces the default page
- Use "use client" directive if component uses hooks or interactivity
- Export default function, not named exports
- Use Tailwind CSS for styling (already configured)
- Components should be functional, complete, and attractive
- NO placeholder content - make it real and working!

User Instruction: ${userInstruction}

`;

    // Add conversation history
    if (history.length > 1) {
      prompt += "\nConversation History:\n";
      for (const entry of history.slice(1)) {
        if (entry.type === "reason") {
          prompt += `\nThought: ${entry.content}`;
        } else if (entry.type === "act") {
          prompt += `\nAction: ${entry.tool}(${JSON.stringify(entry.params)})`;
        } else if (entry.type === "observe") {
          prompt += `\nObservation: ${JSON.stringify(entry.content)}`;
        }
      }
      prompt += "\n";
    }

    prompt += `
CRITICAL: You must respond in this EXACT format. Each section must be on its own line.

Thought: [Your reasoning about what to do next]
Action: [Either "createPage" or "createComponent" or "finish"]
Params: {"name": "filename", "content": "code here with \\n for newlines"}
Final Answer: [Only if action is "finish"]

FORMATTING RULES - FOLLOW EXACTLY:
1. Params MUST be valid JSON on ONE line
2. Use \\n for newlines in content (not actual newlines)
3. Use \\" for quotes in content
4. Do NOT use markdown code blocks
5. The JSON must have BOTH "name" and "content" keys

CORRECT Example - Creating Home Page:
Thought: I'll create the main home page first with hero section and features.
Action: createPage
Params: {"name": "home", "content": "export default function Home() {\\n  return (\\n    <div className=\\"min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 text-white\\">\\n      <div className=\\"max-w-7xl mx-auto px-4 py-20\\">\\n        <h1 className=\\"text-6xl font-bold mb-4\\">Welcome</h1>\\n        <p className=\\"text-xl\\">Build something amazing</p>\\n      </div>\\n    </div>\\n  );\\n}"}

CORRECT Example - Creating Component:
Thought: Now I'll create a reusable Button component.
Action: createComponent  
Params: {"name": "Button", "content": "\\"use client\\";\\n\\nexport default function Button({ text, onClick }) {\\n  return (\\n    <button onClick={onClick} className=\\"bg-blue-500 text-white px-4 py-2 rounded\\">\\n      {text}\\n    </button>\\n  );\\n}"}

CORRECT Example - Finishing:
Thought: All files created successfully.
Action: finish
Final Answer: Created home page at app/page.js and Button component at components/Button.js successfully.

Your turn - respond now:`;

    return prompt;
  }

  // Parse the AI's ReAct response
  parseReActResponse(content) {
    const result = {
      thought: "",
      action: "",
      params: {},
      finalAnswer: "",
    };

    // Extract params from the entire content
    const extractParams = (text) => {
      // Try to find JSON object in the content with balanced braces
      const jsonMatch = text.match(/\{[^{}]*"name"[^{}]*"content"[^{}]*\}/s);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          // Continue to next method
        }
      }

      // Try to find name and content separately
      const nameMatch = text.match(/"name"\s*:\s*"([^"]*)"/);
      const contentMatch = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/s);

      if (nameMatch && contentMatch) {
        return {
          name: nameMatch[1],
          content: contentMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
        };
      }

      return null;
    };

    const lines = content.split("\n");
    let paramsBuffer = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("Thought:")) {
        result.thought = line.substring(8).trim();
      } else if (line.startsWith("Action:")) {
        result.action = line.substring(7).trim();
      } else if (line.startsWith("Params:")) {
        paramsBuffer = line.substring(7).trim();

        // If the line contains a complete JSON object
        if (paramsBuffer.includes("{") && paramsBuffer.includes("}")) {
          // Already complete
        } else if (paramsBuffer.includes("{")) {
          // Collect multi-line JSON
          for (let j = i + 1; j < lines.length; j++) {
            paramsBuffer += " " + lines[j].trim();
            if (lines[j].includes("}")) {
              i = j;
              break;
            }
          }
        }

        // Try to parse the params
        try {
          paramsBuffer = paramsBuffer
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "");
          result.params = JSON.parse(paramsBuffer);
        } catch (e) {
          // Try fallback extraction
          const extracted = extractParams(content);
          if (extracted) {
            result.params = extracted;
          }
        }
      } else if (line.startsWith("Final Answer:")) {
        result.finalAnswer = line.substring(13).trim();
      }
    }

    // Final validation
    if (result.action && result.action !== "finish") {
      if (!result.params || !result.params.name || !result.params.content) {
        const extracted = extractParams(content);
        if (extracted && extracted.name && extracted.content) {
          result.params = extracted;
        } else {
          result.action = "finish";
          result.finalAnswer =
            "Error: Could not parse required parameters from AI response";
        }
      }
    }

    return result;
  }

  // ACT: Execute a tool
  async act(toolName, params) {
    if (this.tools[toolName]) {
      return await this.tools[toolName](params);
    }
    return { error: `Unknown tool: ${toolName}` };
  }

  // Tool: Create a Next.js page
  async createPage(params) {
    const { name, content } = params;

    if (!name || !content) {
      return { error: "Missing required parameter: name or content" };
    }

    await llmLogger.log(`📄 Creating page: ${name}`);

    const outputDir = path.join(__dirname, "output", "nextjs-project", "app");

    try {
      await fs.mkdir(outputDir, { recursive: true });

      let filePath;
      let displayPath;

      // Special handling for home page - replace root page.js
      if (name === "home" || name === "/" || name === "index") {
        filePath = path.join(outputDir, "page.js");
        displayPath = "app/page.js (root home page)";
        await llmLogger.log(`🏠 REPLACING root home page at ${filePath}`);
      } else {
        // Create page in its own directory
        filePath = path.join(outputDir, name, "page.js");
        displayPath = `app/${name}/page.js`;
        await fs.mkdir(path.join(outputDir, name), { recursive: true });
        await llmLogger.log(`📁 Creating page directory: ${name}`);
      }

      await fs.writeFile(filePath, content, "utf-8");
      await llmLogger.log(`✅ Page created successfully: ${displayPath}`);

      return {
        success: true,
        message: `Page created: ${displayPath}`,
        filePath: displayPath,
      };
    } catch (error) {
      await llmLogger.log(`❌ Failed to create page: ${error.message}`);
      return {
        error: `Failed to create page: ${error.message}`,
      };
    }
  }

  // Tool: Create a React component
  async createComponent(params) {
    const { name, content } = params;

    if (!name || !content) {
      return { error: "Missing required parameter: name or content" };
    }

    await llmLogger.log(`🧩 Creating component: ${name}`);

    const outputDir = path.join(
      __dirname,
      "output",
      "nextjs-project",
      "components"
    );

    try {
      await fs.mkdir(outputDir, { recursive: true });
      const filePath = path.join(outputDir, `${name}.js`);
      await fs.writeFile(filePath, content, "utf-8");

      await llmLogger.log(`✅ Component created: components/${name}.js`);

      return {
        success: true,
        message: `Component created: components/${name}.js`,
        filePath: `components/${name}.js`,
      };
    } catch (error) {
      await llmLogger.log(`❌ Failed to create component: ${error.message}`);
      return {
        error: `Failed to create component: ${error.message}`,
      };
    }
  }

  // Initialize Next.js project structure
  async initializeNextProject() {
    const projectDir = path.join(__dirname, "output", "nextjs-project");

    try {
      // Create directory structure
      await fs.mkdir(path.join(projectDir, "app"), { recursive: true });
      await fs.mkdir(path.join(projectDir, "components"), { recursive: true });
      await fs.mkdir(path.join(projectDir, "public"), { recursive: true });

      // Create package.json
      const packageJson = {
        name: "ai-generated-nextjs",
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint",
        },
        dependencies: {
          react: "^18",
          "react-dom": "^18",
          next: "14.0.4",
        },
        devDependencies: {
          autoprefixer: "^10.0.1",
          postcss: "^8",
          tailwindcss: "^3.3.0",
          eslint: "^8",
          "eslint-config-next": "14.0.4",
        },
      };

      await fs.writeFile(
        path.join(projectDir, "package.json"),
        JSON.stringify(packageJson, null, 2),
        "utf-8"
      );

      // Create next.config.js
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
`;
      await fs.writeFile(
        path.join(projectDir, "next.config.js"),
        nextConfig,
        "utf-8"
      );

      // Create tailwind.config.js
      const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`;
      await fs.writeFile(
        path.join(projectDir, "tailwind.config.js"),
        tailwindConfig,
        "utf-8"
      );

      // Create postcss.config.js
      const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`;
      await fs.writeFile(
        path.join(projectDir, "postcss.config.js"),
        postcssConfig,
        "utf-8"
      );

      // Create app/layout.js
      const layout = `import './globals.css'

export const metadata = {
  title: 'AI Generated Next.js App',
  description: 'Created by AI Agent',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`;
      await fs.writeFile(
        path.join(projectDir, "app", "layout.js"),
        layout,
        "utf-8"
      );

      // Create app/globals.css
      const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
      await fs.writeFile(
        path.join(projectDir, "app", "globals.css"),
        globalsCss,
        "utf-8"
      );

      // Create a minimal placeholder page (will be replaced by agent)
      const homePage = `export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800">⚙️ Generating...</h1>
        <p className="mt-4 text-gray-600">AI is creating your website</p>
      </div>
    </div>
  )
}
`;
      await fs.writeFile(
        path.join(projectDir, "app", "page.js"),
        homePage,
        "utf-8"
      );

      // Create .gitignore
      const gitignore = `node_modules
.next
out
*.log
.DS_Store
.env*.local
`;
      await fs.writeFile(
        path.join(projectDir, ".gitignore"),
        gitignore,
        "utf-8"
      );

      // Create README.md
      const readme = `# AI Generated Next.js Project

This project was generated by an AI agent.

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

3. Open [http://localhost:3000](http://localhost:3000) in your browser.
`;
      await fs.writeFile(path.join(projectDir, "README.md"), readme, "utf-8");

      return { success: true, projectDir };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// API Endpoints
const agent = new AIAgent();

app.post("/api/execute", async (req, res) => {
  try {
    const { instruction } = req.body;

    if (!instruction) {
      return res.status(400).json({ error: "Instruction is required" });
    }

    const result = await agent.execute(instruction);
    res.json(result);
  } catch (error) {
    console.error("Error executing agent:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/files", async (req, res) => {
  try {
    const outputDir = path.join(__dirname, "output", "nextjs-project");
    const files = await getFilesRecursively(outputDir);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/install", async (req, res) => {
  try {
    const projectDir = path.join(__dirname, "output", "nextjs-project");

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
    const projectDir = path.join(__dirname, "output", "nextjs-project");

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

    nextJsProcess = spawn("npm", ["run", "dev", "--", "-p", "3002"], {
      cwd: projectDir,
      stdio: "pipe",
      shell: true,
    });

    nextJsProcess.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    nextJsProcess.stderr.on("data", (data) => {
      console.error("Next.js stderr:", data.toString());
    });

    nextJsProcess.on("close", (code) => {
      console.log(`Next.js process exited with code ${code}`);
      nextJsProcess = null;
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    res.json({
      success: true,
      message: "Next.js server started on port 3002",
      url: "http://localhost:3002",
    });
  } catch (error) {
    console.error("❌ Run error:", error);
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
  });
});

app.get("/api/file/:path(*)", async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "output",
      "nextjs-project",
      req.params.path
    );
    const content = await fs.readFile(filePath, "utf-8");
    res.json({ content, path: req.params.path });
  } catch (error) {
    res.status(404).json({ error: "File not found" });
  }
});

app.put("/api/file/:path(*)", async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "output",
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

app.delete("/api/file/:path(*)", async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "output",
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
    const projectDir = path.join(__dirname, "output", "nextjs-project");

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

async function getFilesRecursively(dir) {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next") {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await getFilesRecursively(fullPath);
        files.push(...subFiles);
      } else {
        const content = await fs.readFile(fullPath, "utf-8");
        const relativePath = fullPath.replace(
          path.join(__dirname, "output", "nextjs-project") + path.sep,
          ""
        );
        files.push({
          path: relativePath,
          content,
        });
      }
    }
  } catch (error) {
    // Directory doesn't exist yet
  }
  return files;
}

// Deploy to Vercel
app.post("/api/deploy", async (req, res) => {
  try {
    const projectDir = path.join(__dirname, "output", "nextjs-project");
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI Agent backend running on port ${PORT}`);
  console.log("Make sure to set ANTHROPIC_API_KEY environment variable");
});
