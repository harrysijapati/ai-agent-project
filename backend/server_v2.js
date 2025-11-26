const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const { exec, spawn } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

let nextJsProcess = null;

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
  async execute(userInstruction, skipPlanning = false) {
    const history = [];
    let iteration = 0;

    // If not skipping planning, generate plan first
    if (!skipPlanning) {
      const plan = await this.generatePlan(userInstruction);
      return {
        success: true,
        needsConfirmation: true,
        plan: plan,
        instruction: userInstruction,
      };
    }

    // Initialize Next.js project
    const initResult = await this.initializeNextProject();
    if (initResult.error) {
      return {
        success: false,
        error: "Failed to initialize Next.js project: " + initResult.error,
        history,
      };
    }

    history.push({
      type: "user_instruction",
      content: userInstruction,
    });

    while (iteration < this.maxIterations) {
      iteration++;

      // REASON: Generate reasoning and determine action
      const reasoning = await this.reason(userInstruction, history);
      history.push({
        type: "reason",
        content: reasoning.thought,
        iteration,
      });

      // Check if task is complete
      if (reasoning.action === "finish") {
        history.push({
          type: "complete",
          content: reasoning.finalAnswer,
          iteration,
        });
        break;
      }

      // ACT: Execute the tool
      const action = {
        type: "act",
        tool: reasoning.action,
        params: reasoning.params,
        iteration,
      };
      history.push(action);

      // Execute tool and get result
      const observation = await this.act(reasoning.action, reasoning.params);

      // OBSERVE: Record the result
      history.push({
        type: "observe",
        content: observation,
        iteration,
      });

      // If there's an error, break
      if (observation.error) {
        break;
      }
    }

    return {
      success: true,
      history,
      iterations: iteration,
    };
  }

  // REASON: Use Claude API to determine next action
  async reason(userInstruction, history) {
    try {
      const prompt = `You are a web development planner. Based on the user's instruction, create a detailed plan for a Next.js website.

User Instruction: ${userInstruction}

Create a comprehensive plan that includes:
1. Website Structure (pages needed)
2. Components to create (reusable UI elements)
3. Key Features to implement
4. Design approach (styling, layout, color scheme)
5. Estimated complexity (Simple/Medium/Complex)

Respond in a clear, structured format that the user can review and approve.

Example format:

📋 Website Plan

🎯 Project: [Brief description]

📄 Pages to Create:
- Home (/) - [description]
- About (/about) - [description]
- Contact (/contact) - [description]

🧩 Components to Build:
- Button - [purpose]
- Card - [purpose]
- Header - [purpose]

✨ Key Features:
- Responsive design
- Modern UI with Tailwind CSS
- Interactive elements

🎨 Design Approach:
- Color scheme: [colors]
- Layout: [description]
- Style: [modern/minimalist/etc]

⚙️ Complexity: [Simple/Medium/Complex]

Now create the plan:`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (data.error) {
        return "Error generating plan: " + data.error.message;
      }

      return data.content[0].text;
    } catch (error) {
      console.error("Error generating plan:", error);
      return "Error generating plan: " + error.message;
    }

    // Create prompt with auto-prompting guidance
    const prompt = this.buildReActPrompt(userInstruction, history);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error("Claude API error:", data.error);
        return {
          thought: "Error occurred while reasoning",
          action: "finish",
          finalAnswer: "API Error: " + data.error.message,
        };
      }

      const content = data.content[0].text;
      console.log("Claude Response:", content); // Debug log

      // Parse the ReAct response
      return this.parseReActResponse(content);
    } catch (error) {
      console.error("Error calling Claude API:", error);
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
   - name: string (route name like "about", "contact", etc.)
   - content: string (the full React component code)
   - This creates: app/[name]/page.js

2. createComponent(name, content) - Creates a reusable React component
   - name: string (component name like "Button", "Card", etc.)
   - content: string (the full React component code)
   - This creates: components/[name].js

IMPORTANT - Next.js 14 App Router Guidelines:
- Use "use client" directive if component uses hooks or interactivity
- Export default function, not named exports
- Use Tailwind CSS for styling (already configured)
- Components should be functional and well-structured

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

CORRECT Example 1:
Thought: Creating a simple home page with a title.
Action: createPage
Params: {"name": "home", "content": "export default function Home() {\\n  return (\\n    <div className=\\"min-h-screen p-8\\">\\n      <h1 className=\\"text-4xl font-bold\\">Home</h1>\\n    </div>\\n  );\\n}"}

CORRECT Example 2:
Thought: Creating a button component with interactivity.
Action: createComponent  
Params: {"name": "Button", "content": "\\"use client\\";\\n\\nexport default function Button({ text, onClick }) {\\n  return (\\n    <button onClick={onClick} className=\\"bg-blue-500 text-white px-4 py-2 rounded\\">\\n      {text}\\n    </button>\\n  );\\n}"}

CORRECT Example 3:
Thought: All files created successfully.
Action: finish
Final Answer: Created home page at app/home/page.js and Button component at components/Button.js successfully.

WRONG Example (DO NOT DO THIS):
Action: createPage
Params: {
  "name": "home",
  "content": "export default function Home() {
    return <div>Home</div>;
  }"
}

Your turn - respond now:`;

    return prompt;
  }

  // Parse the AI's ReAct response
  parseReActResponse(content) {
    console.log("\n=== Parsing Claude Response ===");
    console.log(content);
    console.log("================================\n");

    const result = {
      thought: "",
      action: "",
      params: {},
      finalAnswer: "",
    };

    // Try to extract params from the entire content using regex as fallback
    const extractParams = (text) => {
      // Look for JSON object in the content
      const jsonMatch = text.match(/\{[^{}]*"name"[^{}]*"content"[^{}]*\}/s);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse extracted JSON:", e);
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
    let collectingParams = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("Thought:")) {
        result.thought = line.substring(8).trim();
      } else if (line.startsWith("Action:")) {
        result.action = line.substring(7).trim();
      } else if (line.startsWith("Params:")) {
        collectingParams = true;
        paramsBuffer = line.substring(7).trim();

        // If the line contains a complete JSON object
        if (paramsBuffer.includes("{") && paramsBuffer.includes("}")) {
          collectingParams = false;
        } else if (paramsBuffer.includes("{")) {
          // Start collecting multi-line JSON
          for (let j = i + 1; j < lines.length; j++) {
            paramsBuffer += " " + lines[j].trim();
            if (lines[j].includes("}")) {
              i = j;
              collectingParams = false;
              break;
            }
          }
        }

        // Try to parse the params
        try {
          // Remove any markdown code blocks
          paramsBuffer = paramsBuffer
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "");
          result.params = JSON.parse(paramsBuffer);
          console.log("Successfully parsed params:", result.params);
        } catch (e) {
          console.error("Error parsing params from buffer:", paramsBuffer);
          console.error("Parse error:", e.message);

          // Try fallback extraction
          const extracted = extractParams(content);
          if (extracted) {
            console.log("Fallback extraction succeeded:", extracted);
            result.params = extracted;
          } else {
            console.error("Fallback extraction also failed");
          }
        }
      } else if (line.startsWith("Final Answer:")) {
        result.finalAnswer = line.substring(13).trim();
      }
    }

    // Final validation
    if (result.action && result.action !== "finish") {
      if (!result.params || !result.params.name || !result.params.content) {
        console.error("❌ Missing required params!");
        console.error("Current params:", result.params);
        console.error("Action was:", result.action);

        // Try one more time with full content extraction
        const extracted = extractParams(content);
        if (extracted && extracted.name && extracted.content) {
          console.log("✅ Emergency extraction successful:", extracted);
          result.params = extracted;
        } else {
          result.action = "finish";
          result.finalAnswer =
            "Error: Could not parse required parameters (name and content) from AI response";
        }
      } else {
        console.log("✅ Validation passed - params are complete");
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

    // Validate params
    if (!name) {
      return { error: "Missing required parameter: name" };
    }
    if (!content) {
      return { error: "Missing required parameter: content" };
    }

    const outputDir = path.join(__dirname, "output", "nextjs-project", "app");

    try {
      await fs.mkdir(outputDir, { recursive: true });
      const filePath = path.join(outputDir, `${name}`, "page.js");
      await fs.mkdir(path.join(outputDir, name), { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");

      return {
        success: true,
        message: `Page created: app/${name}/page.js`,
        filePath: `app/${name}/page.js`,
      };
    } catch (error) {
      return {
        error: `Failed to create page: ${error.message}`,
      };
    }
  }

  // Tool: Create a React component
  async createComponent(params) {
    const { name, content } = params;

    // Validate params
    if (!name) {
      return { error: "Missing required parameter: name" };
    }
    if (!content) {
      return { error: "Missing required parameter: content" };
    }

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

      return {
        success: true,
        message: `Component created: components/${name}.js`,
        filePath: `components/${name}.js`,
      };
    } catch (error) {
      return {
        error: `Failed to create component: ${error.message}`,
      };
    }
  }

  // Add this method to your AIAgent class, right after the constructor

  async generatePlan(userInstruction) {
    try {
      const prompt = `You are a web development planner. Based on the user's instruction, create a detailed plan for a Next.js website.

User Instruction: ${userInstruction}

Create a comprehensive plan that includes:
1. Website Structure (pages needed)
2. Components to create (reusable UI elements)
3. Key Features to implement
4. Design approach (styling, layout, color scheme)
5. Estimated complexity (Simple/Medium/Complex)

Respond in a clear, structured format that the user can review and approve.

Example format:

📋 Website Plan

🎯 Project: [Brief description]

📄 Pages to Create:
- Home (/) - [description]
- About (/about) - [description]
- Contact (/contact) - [description]

🧩 Components to Build:
- Button - [purpose]
- Card - [purpose]
- Header - [purpose]

✨ Key Features:
- Responsive design
- Modern UI with Tailwind CSS
- Interactive elements

🎨 Design Approach:
- Color scheme: [colors]
- Layout: [description]
- Style: [modern/minimalist/etc]

⚙️ Complexity: [Simple/Medium/Complex]

Now create the plan:`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (data.error) {
        return "Error generating plan: " + data.error.message;
      }

      return data.content[0].text;
    } catch (error) {
      console.error("Error generating plan:", error);
      return "Error generating plan: " + error.message;
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

      // Create app/page.js (default home page)
      const homePage = `export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold">Welcome to Your AI Generated Site</h1>
      <p className="mt-4 text-gray-600">This site was created by an AI agent!</p>
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
      console.error("Error initializing project:", error);
      return { error: error.message };
    }
  }
}

// API Endpoints
const agent = new AIAgent();

app.post("/api/execute", async (req, res) => {
  try {
    const { instruction, confirmed } = req.body;

    if (!instruction) {
      return res.status(400).json({ error: "Instruction is required" });
    }

    // If confirmed is true, skip planning and proceed with generation
    const result = await agent.execute(instruction, confirmed === true);
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

// Install dependencies in the Next.js project
app.post("/api/install", async (req, res) => {
  try {
    const projectDir = path.join(__dirname, "output", "nextjs-project");

    // Check if project exists
    try {
      await fs.access(projectDir);
    } catch {
      return res
        .status(404)
        .json({ error: "Project not found. Please generate files first." });
    }

    console.log("📦 Installing dependencies...");
    const { stdout, stderr } = await execPromise("npm install", {
      cwd: projectDir,
      timeout: 120000, // 2 minutes timeout
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

// Start the Next.js development server
app.post("/api/run", async (req, res) => {
  try {
    const projectDir = path.join(__dirname, "output", "nextjs-project");

    // Check if already running
    if (nextJsProcess) {
      return res.json({
        success: true,
        message: "Next.js server is already running",
        url: "http://localhost:3002",
      });
    }

    // Check if project exists
    try {
      await fs.access(projectDir);
    } catch {
      return res
        .status(404)
        .json({ error: "Project not found. Please generate files first." });
    }

    // Check if node_modules exists
    try {
      await fs.access(path.join(projectDir, "node_modules"));
    } catch {
      return res.status(400).json({
        error: "Dependencies not installed. Please install dependencies first.",
      });
    }

    console.log("🚀 Starting Next.js server...");

    // Start Next.js on port 3002 (to avoid conflict with frontend on 3000)
    nextJsProcess = spawn("npm", ["run", "dev", "--", "-p", "3002"], {
      cwd: projectDir,
      stdio: "pipe",
      shell: true,
    });

    let serverReady = false;

    nextJsProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(output);

      if (output.includes("Ready") || output.includes("started server")) {
        serverReady = true;
      }
    });

    nextJsProcess.stderr.on("data", (data) => {
      console.error("Next.js stderr:", data.toString());
    });

    nextJsProcess.on("close", (code) => {
      console.log(`Next.js process exited with code ${code}`);
      nextJsProcess = null;
    });

    // Wait a bit for server to start
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

// Stop the Next.js development server
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

// Get server status
app.get("/api/status", (req, res) => {
  res.json({
    running: nextJsProcess !== null,
    url: nextJsProcess ? "http://localhost:3002" : null,
  });
});

// Get a specific file content
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

// Update a file
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

// Delete a file
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

// Get project structure as tree
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
      // Skip node_modules and .next directories
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI Agent backend running on port ${PORT}`);
  console.log("Make sure to set ANTHROPIC_API_KEY environment variable");
});
