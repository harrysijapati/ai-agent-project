const logger = require("../../utils/logger.util");
const llmLogger = logger;
const config = require("../../config");
const fs = require("fs").promises;
const path = require("path");
const { exec, spawn } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
let errorBuffer = []; // Store runtime errors

class AIAgent {
  constructor() {
    this.tools = {
      createPage: this.createPage.bind(this),
      createComponent: this.createComponent.bind(this),
      updatePage: this.updatePage.bind(this), // NEW: For adding sections
      fixError: this.fixError.bind(this),
    };
    this.maxIterations = 10; // Increased from 5 to ensure home page gets created
  }

  // NEW: Analyze runtime errors
  async analyzeErrors() {
    await llmLogger.log("\n🔍 ANALYZING RUNTIME ERRORS");

    if (errorBuffer.length === 0) {
      return null;
    }

    const errors = {
      buildErrors: [],
      runtimeErrors: [],
      missingComponents: [],
      missingImports: [],
    };

    errorBuffer.forEach((error) => {
      if (
        error.includes("Module not found") ||
        error.includes("Cannot find module")
      ) {
        const match = error.match(/Cannot find module ['"](.+?)['"]/);
        if (match) {
          errors.missingImports.push(match[1]);
        }
      } else if (
        error.includes("is not defined") ||
        error.includes("ReferenceError")
      ) {
        errors.missingComponents.push(error);
      } else if (
        error.includes("Error:") ||
        error.includes("Failed to compile")
      ) {
        errors.buildErrors.push(error);
      } else {
        errors.runtimeErrors.push(error);
      }
    });

    await llmLogger.logJSON("📊 Error Analysis", errors);
    return errors;
  }

  // NEW: Generate error fix prompt
  async generateErrorFixPrompt(errors, context) {
    await llmLogger.log("\n🔧 GENERATING ERROR FIX PROMPT");

    const prompt = `You are fixing errors in a Next.js project.

ERRORS DETECTED:
${JSON.stringify(errors, null, 2)}

CURRENT PROJECT CONTEXT:
${JSON.stringify(context, null, 2)}

Analyze the errors and create a fix plan:

1. MISSING COMPONENTS: List components that need to be created
2. MISSING IMPORTS: List imports that need to be added
3. CODE FIXES: List files that need modification

Respond in this format:

🔧 ERROR FIX PLAN

🎯 Issues Found: [count]

📝 Actions Required:
1. Create missing components: [list]
2. Fix imports in: [list]
3. Modify files: [list]

Now create the plan:`;

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
      const plan = data.content[0].text;
      await llmLogger.logSection("🔧 ERROR FIX PLAN", plan);
      return plan;
    } catch (error) {
      await llmLogger.log(`❌ Error generating fix plan: ${error.message}`);
      return null;
    }
  }

  // NEW: Load project context from file
  async loadContextFromFile() {
    const contextFile = path.join(
      __dirname,
      "output",
      "nextjs-project",
      ".ai-context.json"
    );
    try {
      const data = await fs.readFile(contextFile, "utf-8");
      const context = JSON.parse(data);
      await llmLogger.log("✅ Loaded context from file");
      return context;
    } catch (error) {
      await llmLogger.log("⚠️ No context file found, will create new one");
      return null;
    }
  }

  // NEW: Save project context to file
  async saveContextToFile(context) {
    const contextFile = path.join(
      __dirname,
      "output",
      "nextjs-project",
      ".ai-context.json"
    );
    try {
      await fs.writeFile(
        contextFile,
        JSON.stringify(context, null, 2),
        "utf-8"
      );
      await llmLogger.log("✅ Context saved to file");
    } catch (error) {
      await llmLogger.log(`⚠️ Failed to save context: ${error.message}`);
    }
  }

  // Analyze existing project context
  async analyzeContext() {
    await llmLogger.log("\n🔍 ANALYZING PROJECT CONTEXT");

    const projectDir = path.join(__dirname, "output", "nextjs-project");
    const context = {
      pages: [],
      components: [],
      structure: "Next.js 14 App Router",
      style: "Tailwind CSS",
      errors: [],
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        totalIterations: 0,
      },
    };

    // Try to load existing context first
    const savedContext = await this.loadContextFromFile();
    if (savedContext) {
      context.metadata = savedContext.metadata || context.metadata;
    }

    try {
      await fs.access(projectDir);

      // Scan pages
      const appDir = path.join(projectDir, "app");
      try {
        const appEntries = await fs.readdir(appDir, { withFileTypes: true });
        for (const entry of appEntries) {
          if (entry.isFile() && entry.name === "page.js") {
            const content = await fs.readFile(
              path.join(appDir, entry.name),
              "utf-8"
            );
            context.pages.push({
              path: "app/page.js (home)",
              name: "home",
              preview: content.substring(0, 200),
              hasErrors: this.checkFileForErrors(content),
            });
          } else if (
            entry.isDirectory() &&
            !["node_modules", ".next"].includes(entry.name)
          ) {
            const pagePath = path.join(appDir, entry.name, "page.js");
            try {
              const content = await fs.readFile(pagePath, "utf-8");
              context.pages.push({
                path: `app/${entry.name}/page.js`,
                name: entry.name,
                preview: content.substring(0, 200),
                hasErrors: this.checkFileForErrors(content),
              });
            } catch {}
          }
        }
      } catch {}

      // Scan components
      const componentsDir = path.join(projectDir, "components");
      try {
        const componentFiles = await fs.readdir(componentsDir);
        for (const file of componentFiles) {
          if (file.endsWith(".js")) {
            const content = await fs.readFile(
              path.join(componentsDir, file),
              "utf-8"
            );
            context.components.push({
              name: file.replace(".js", ""),
              path: `components/${file}`,
              preview: content.substring(0, 150),
            });
          }
        }
      } catch {}

      // Check for errors
      const errorAnalysis = await this.analyzeErrors();
      if (errorAnalysis) {
        context.errors = errorAnalysis;
      }

      // Save updated context
      await this.saveContextToFile(context);

      await llmLogger.logJSON("📊 Context Analysis Result", context);
      return context;
    } catch (error) {
      await llmLogger.log("⚠️ No existing project found");
      return null;
    }
  }

  // NEW: Check if file content has potential errors
  checkFileForErrors(content) {
    const issues = [];

    // Check for missing imports
    const componentUsage = content.match(/<([A-Z][a-zA-Z0-9]*)/g);
    if (componentUsage) {
      componentUsage.forEach((comp) => {
        const componentName = comp.slice(1);
        if (
          !content.includes(`import ${componentName}`) &&
          !content.includes(`import {`) &&
          !["Link", "Image", "Head"].includes(componentName)
        ) {
          issues.push(`Missing import for ${componentName}`);
        }
      });
    }

    return issues.length > 0 ? issues : null;
  }

  // Generate iteration plan
  async generateIterationPlan(instruction, context) {
    await llmLogger.log("\n📋 GENERATING ITERATION PLAN");

    // SAFE CHECK: Ensure context has required properties
    if (!context) {
      return "Error: No context available";
    }

    const safeContext = {
      pages: context.pages || [],
      components: context.components || [],
      errors: context.errors || {},
      structure: context.structure || "Next.js 14 App Router",
      style: context.style || "Tailwind CSS",
      metadata: context.metadata || {},
    };

    // Check if this is an auto-fix iteration
    const isErrorFix =
      safeContext.errors &&
      ((safeContext.errors.missingComponents &&
        safeContext.errors.missingComponents.length > 0) ||
        (safeContext.errors.missingImports &&
          safeContext.errors.missingImports.length > 0) ||
        (safeContext.errors.buildErrors &&
          safeContext.errors.buildErrors.length > 0));

    // Create compact context summary to reduce tokens
    const contextSummary = {
      totalPages: safeContext.pages.length,
      pageNames: safeContext.pages.map((p) => p.name),
      totalComponents: safeContext.components.length,
      componentNames: safeContext.components.map((c) => c.name),
      hasErrors: isErrorFix,
      errorCount: isErrorFix
        ? Object.values(safeContext.errors).flat().length
        : 0,
    };

    let prompt;

    if (isErrorFix) {
      // OPTIMIZED: Shorter prompt for error fixing
      prompt = `Fix errors in Next.js project.

CONTEXT: ${safeContext.pages.length} pages, ${
        safeContext.components.length
      } components

ERRORS:
${JSON.stringify(safeContext.errors, null, 2)}

Create fix plan:
1. Components to CREATE
2. Files to MODIFY
3. Expected outcome

Format:
🔧 FIX PLAN
🎯 Goal: [brief]
✏️ MODIFY: [list]
➕ CREATE: [list]
✅ OUTCOME: [brief]`;
    } else {
      // OPTIMIZED: Shorter prompt for regular iterations
      prompt = `Modify Next.js project.

CURRENT STATE:
- Pages: ${contextSummary.pageNames.join(", ")}
- Components: ${contextSummary.componentNames.join(", ")}

REQUEST: ${instruction}

Create plan:
1. What to MODIFY
2. What to CREATE
3. Components needed

Format:
📋 PLAN
🎯 Goal: [brief]
✏️ MODIFY: [list]
➕ CREATE: [list]
🧩 COMPONENTS: [list]
⚠️ IMPACT: [brief]`;
    }

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
        return "Error generating iteration plan: " + data.error.message;
      }

      const plan = data.content[0].text;
      await llmLogger.logSection("📋 ITERATION PLAN", plan);
      return plan;
    } catch (error) {
      await llmLogger.log(
        `❌ Error in generateIterationPlan: ${error.message}`
      );
      return "Error generating plan: " + error.message;
    }
  }

  // NEW: Delete entire output folder for fresh start
  async deleteOutputFolder() {
    const outputDir = path.join(__dirname, "output", "nextjs-project");

    await llmLogger.log("\n🗑️ DELETING OUTPUT FOLDER FOR FRESH START");

    try {
      // Check if folder exists
      await fs.access(outputDir);
      await llmLogger.log(`📁 Found existing project at: ${outputDir}`);

      // Delete the entire directory recursively
      await fs.rm(outputDir, { recursive: true, force: true });
      await llmLogger.log(`✅ Output folder deleted successfully`);

      return { success: true };
    } catch (error) {
      if (error.code === "ENOENT") {
        await llmLogger.log(`✨ No existing output folder found (fresh start)`);
        return { success: true };
      }

      await llmLogger.log(`⚠️ Error deleting output folder: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // NEW: Verify what files were created
  async verifyProjectFiles() {
    const projectDir = path.join(__dirname, "output", "nextjs-project");
    const verification = {
      homePageExists: false,
      homePageHasContent: false,
      componentsCreated: [],
      pagesCreated: [],
    };

    try {
      // Check home page
      const homePagePath = path.join(projectDir, "app", "page.js");
      try {
        const homeContent = await fs.readFile(homePagePath, "utf-8");
        verification.homePageExists = true;

        // Check if it's not placeholder
        if (
          !homeContent.includes("⚙️ Generating...") &&
          !homeContent.includes("AI is creating") &&
          homeContent.length > 500
        ) {
          verification.homePageHasContent = true;
        }
      } catch {}

      // Check components
      const componentsDir = path.join(projectDir, "components");
      try {
        const files = await fs.readdir(componentsDir);
        verification.componentsCreated = files.filter((f) => f.endsWith(".js"));
      } catch {}

      // Check pages
      const appDir = path.join(projectDir, "app");
      try {
        const entries = await fs.readdir(appDir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            !["node_modules", ".next"].includes(entry.name)
          ) {
            verification.pagesCreated.push(entry.name);
          }
        }
      } catch {}

      await llmLogger.logJSON("📊 Project Verification", verification);
      return verification;
    } catch (error) {
      await llmLogger.log(`⚠️ Verification failed: ${error.message}`);
      return verification;
    }
  }

  // Main agent loop
  async execute(
    userInstruction,
    mode = "new",
    iterationCount = 0,
    autoFix = false,
    confirmed = false
  ) {
    const history = [];
    let iteration = 0;

    await llmLogger.log(
      `\n🚀 EXECUTE METHOD CALLED - Mode: ${mode}, AutoFix: ${autoFix}, Confirmed: ${confirmed}`
    );
    await llmLogger.log(`User Instruction: ${userInstruction}`);
    await llmLogger.log(`Iteration Count: ${iterationCount}`);

    // NEW PROJECT MODE - Delete existing output folder first
    if (mode === "new" && confirmed) {
      await llmLogger.log("🏗️ NEW PROJECT MODE - Starting fresh");

      // Delete existing output folder
      const deleteResult = await this.deleteOutputFolder();
      if (!deleteResult.success) {
        return {
          success: false,
          error: "Failed to delete existing project: " + deleteResult.error,
        };
      }
    }

    // Check iteration limit
    if (mode === "iterate" && iterationCount >= 5) {
      return {
        success: false,
        error:
          "Maximum iterations (5) reached. Consider regenerating the project.",
        suggestRegenerate: true,
      };
    }

    // NEW PROJECT MODE - Generate plan first (if not confirmed and not autoFix)
    if (mode === "new" && !confirmed && !autoFix) {
      await llmLogger.log("🏗️ NEW PROJECT MODE - Generating plan first");

      // Generate a plan for new projects too
      const planPrompt = `Create a Next.js 14 website plan.

REQUEST: ${userInstruction}

Create a detailed plan showing:
1. Pages to CREATE (home page and other pages)
2. Components to CREATE (all reusable components)
3. Design approach
4. Features to include

Format:
📋 PROJECT PLAN

🎯 Goal: [brief description]

📄 PAGES TO CREATE:
- [list all pages with brief description]

🧩 COMPONENTS TO CREATE:
- [list all components with purpose]

🎨 DESIGN:
- [style, colors, layout approach]

✨ FEATURES:
- [key features to implement]

Create the plan:`;

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
            messages: [{ role: "user", content: planPrompt }],
          }),
        });

        const data = await response.json();

        if (data.error) {
          return {
            success: false,
            error: "Error generating plan: " + data.error.message,
          };
        }

        const plan = data.content[0].text;
        await llmLogger.logSection("📋 NEW PROJECT PLAN", plan);

        // Return plan for confirmation
        return {
          success: true,
          needsConfirmation: true,
          mode: "new",
          plan: plan,
          instruction: userInstruction,
          iterationCount: 0,
        };
      } catch (error) {
        await llmLogger.log(`❌ Error generating plan: ${error.message}`);
        return {
          success: false,
          error: "Error generating plan: " + error.message,
        };
      }
    }

    // ITERATION MODE - Analyze context and generate plan (if not confirmed and not autoFix)
    if (mode === "iterate" && !confirmed && !autoFix) {
      await llmLogger.log(
        "🔄 ITERATION MODE - Analyzing context and generating plan"
      );
      const context = await this.analyzeContext();

      if (!context || context.pages.length === 0) {
        return {
          success: false,
          error:
            "No existing project found. Please generate a project first or switch to 'new' mode.",
          needsNewProject: true,
        };
      }

      // Generate iteration plan
      const plan = await this.generateIterationPlan(userInstruction, context);

      // Return plan for confirmation - DON'T EXECUTE YET
      return {
        success: true,
        needsConfirmation: true,
        mode: "iterate",
        plan: plan,
        instruction: userInstruction,
        context: context,
        iterationCount: iterationCount,
        hasErrors:
          context.errors &&
          Object.values(context.errors).some((arr) => arr.length > 0),
      };
    }

    // EXECUTE MODE - Actually build/modify the project
    // This runs after confirmation (confirmed=true) or in autoFix mode

    await llmLogger.log("⚙️ EXECUTION MODE - Confirmed, now executing changes");

    // Initialize project if new mode
    if (mode === "new" && confirmed) {
      await llmLogger.log("🏗️ NEW PROJECT MODE - Initializing");
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
    }

    history.push({
      type: "user_instruction",
      content: userInstruction,
    });

    await llmLogger.log("🔄 Starting agent iteration loop...");

    while (iteration < this.maxIterations) {
      iteration++;
      await llmLogger.log(
        `\n======== ITERATION ${iteration}/${this.maxIterations} ========`
      );

      // REASON: Generate reasoning with context awareness
      await llmLogger.log("🤔 REASONING...");
      const reasoning = await this.reason(userInstruction, history, mode);

      await llmLogger.log(`💭 Thought: ${reasoning.thought}`);
      await llmLogger.log(`🎯 Action: ${reasoning.action}`);
      if (reasoning.params && reasoning.params.name) {
        await llmLogger.log(`📝 Target: ${reasoning.params.name}`);
      }

      history.push({
        type: "reason",
        content: reasoning.thought,
        iteration,
      });

      // Check if task is complete
      if (reasoning.action === "finish") {
        await llmLogger.log("✅ Task marked as complete");

        // IMPORTANT CHECK: Verify home page was created
        if (mode === "new") {
          const homePagePath = path.join(
            __dirname,
            "output",
            "nextjs-project",
            "app",
            "page.js"
          );
          try {
            const homeContent = await fs.readFile(homePagePath, "utf-8");

            // Check if it's still the placeholder
            if (
              homeContent.includes("⚙️ Generating...") ||
              homeContent.includes("AI is creating")
            ) {
              await llmLogger.log(
                "⚠️ WARNING: Home page still has placeholder content!"
              );
              await llmLogger.log(
                "🔄 Agent finished but home page not properly created"
              );

              // Don't finish yet - continue to create home page
              await llmLogger.log("📝 Forcing creation of home page...");

              // Add a reminder to history
              history.push({
                type: "system_note",
                content:
                  "Home page still has placeholder. Must create home page with name='home'",
                iteration,
              });

              // Don't break - let it continue
              continue;
            } else {
              await llmLogger.log(
                "✅ Home page properly created with custom content"
              );
            }
          } catch (error) {
            await llmLogger.log(
              "⚠️ Could not verify home page: " + error.message
            );
          }
        }

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

    // Clear error buffer after successful execution
    errorBuffer = [];

    return {
      success: true,
      history,
      iterations: iteration,
      mode: mode,
    };
  }

  // REASON: Use Claude API to determine next action
  async reason(userInstruction, history, mode = "new") {
    await llmLogger.log(`\n🤔 REASON METHOD CALLED - Mode: ${mode}`);

    const prompt = this.buildReActPrompt(userInstruction, history, mode);
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
  buildReActPrompt(userInstruction, history, mode = "new") {
    let prompt = "";

    if (mode === "iterate") {
      // OPTIMIZED: Shorter, more focused prompt
      prompt = `Modify Next.js 14 project.

Tools:
1. createPage(name, content) - REPLACE entire page with new content
   - Use name="home" to replace app/page.js (main landing page)
2. updatePage(name, section, position) - ADD section to existing page
   - position: "before_closing", "after_opening", "replace", or "append"
3. createComponent(name, content) - Create/replace components

WHEN TO USE EACH TOOL:
- Use createPage with name="home" for: Complete home page redesign
- Use updatePage for: Adding sections (testimonials, features, CTA, etc.)
- Use createComponent when: Creating reusable components

CRITICAL RULES:
- Create components BEFORE using them in pages
- Import components: import ComponentName from '../components/ComponentName'
- Use "use client" for interactive components
- For adding sections, use updatePage to preserve existing content

Request: ${userInstruction}

`;
    } else {
      // NEW PROJECT MODE - More explicit about home page
      prompt = `Create Next.js 14 project from scratch.

Tools:
1. createPage(name, content) - Create pages
   - IMPORTANT: Use name="home" for the main landing page (replaces app/page.js)
   - Use name="about", "contact", etc. for other pages
2. createComponent(name, content) - Create reusable components

CRITICAL EXECUTION ORDER - FOLLOW EXACTLY:
1. FIRST: Create ALL components that will be used (Header, Hero, Features, Footer, etc.)
2. THEN: Create the home page using name="home" with ALL components imported and used
3. THEN: Create other pages if requested

EXAMPLE CORRECT SEQUENCE:
Thought: I need to create Header, Hero, Features, Footer components first
Action: createComponent
Params: {"name": "Header", "content": "...complete Header code..."}

(After Header is created)
Thought: Now create Hero component
Action: createComponent  
Params: {"name": "Hero", "content": "...complete Hero code..."}

(After all components)
Thought: Now create home page that imports and uses all components
Action: createPage
Params: {"name": "home", "content": "...complete page with imports..."}

IMPORTANT RULES:
- ALWAYS create home page with name="home" (this replaces app/page.js)
- Include "use client" if using hooks or interactivity
- Import all components: import ComponentName from '../components/ComponentName'
- Use Tailwind CSS for styling
- Make components complete and functional (NO placeholders!)
- Export default function from all files

Request: ${userInstruction}

`;
    }

    // OPTIMIZED: Only include recent history (last 3 steps)
    if (history.length > 1) {
      const recentHistory = history.slice(-6); // Last 6 items (3 complete cycles)
      prompt += "\nRecent Actions:\n";
      for (const entry of recentHistory) {
        if (entry.type === "reason") {
          prompt += `Thought: ${entry.content}\n`;
        } else if (entry.type === "act") {
          prompt += `Action: ${entry.tool}(${entry.params.name})\n`;
        } else if (entry.type === "observe") {
          const msg = entry.content.error || entry.content.message || "";
          prompt += `Result: ${msg.substring(0, 100)}\n`;
        }
      }
    }

    prompt += `
Response format:

Thought: [Your reasoning - if creating project, mention creating components first, then home page]
Action: [createPage|createComponent|updatePage|finish]
Params: {"name": "filename", "content": "code with \\n for newlines"}
Final Answer: [only if action=finish]

FORMATTING RULES:
1. Params = valid JSON on ONE line
2. Use \\n for newlines, \\" for quotes
3. NO markdown blocks
4. Must have "name" and "content"

CRITICAL REMINDER FOR NEW PROJECTS:
- Create ALL components FIRST
- Then create home page with name="home" 
- Home page must import and use all components
- This is the MAIN landing page at app/page.js
- DO NOT finish without creating home page!

CHECK BEFORE FINISHING:
- Have you created the home page with name="home"?
- Does the home page import and use all components?
- Is the home page content complete (not just a placeholder)?
- Only say "finish" after home page is created!

Respond now:`;

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

    const extractParams = (text) => {
      const jsonMatch = text.match(/\{[^{}]*"name"[^{}]*"content"[^{}]*\}/s);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {}
      }

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

        if (paramsBuffer.includes("{") && paramsBuffer.includes("}")) {
          // Already complete
        } else if (paramsBuffer.includes("{")) {
          for (let j = i + 1; j < lines.length; j++) {
            paramsBuffer += " " + lines[j].trim();
            if (lines[j].includes("}")) {
              i = j;
              break;
            }
          }
        }

        try {
          paramsBuffer = paramsBuffer
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "");
          result.params = JSON.parse(paramsBuffer);
        } catch (e) {
          const extracted = extractParams(content);
          if (extracted) {
            result.params = extracted;
          }
        }
      } else if (line.startsWith("Final Answer:")) {
        result.finalAnswer = line.substring(13).trim();
      }
    }

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
      // Ensure base app directory exists
      await fs.mkdir(outputDir, { recursive: true });

      let filePath;
      let displayPath;

      if (name === "home" || name === "/" || name === "index") {
        // Root home page - just app/page.js
        filePath = path.join(outputDir, "page.js");
        displayPath = "app/page.js (root home page)";

        await llmLogger.log(`🏠 Target: ${filePath}`);

        // Check if file exists
        let fileExists = false;
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            fileExists = true;
            await llmLogger.log(`🔄 File exists, will overwrite`);
          } else if (stats.isDirectory()) {
            // This is the bug! page.js is a directory somehow
            await llmLogger.log(
              `❌ ERROR: page.js exists as DIRECTORY, removing it`
            );
            await fs.rmdir(filePath, { recursive: true });
            fileExists = false;
          }
        } catch (err) {
          await llmLogger.log(`✨ File doesn't exist, will create new`);
        }

        // Delete file if it exists
        if (fileExists) {
          try {
            await fs.unlink(filePath);
            await llmLogger.log(`✅ Old file removed`);
          } catch (unlinkError) {
            await llmLogger.log(
              `⚠️ Could not remove old file: ${unlinkError.message}`
            );
          }
        }
      } else {
        // Other pages - app/[name]/page.js
        const pageDir = path.join(outputDir, name);
        filePath = path.join(pageDir, "page.js");
        displayPath = `app/${name}/page.js`;

        await llmLogger.log(`📁 Target: ${filePath}`);

        // Ensure the page directory exists (NOT the file!)
        try {
          await fs.mkdir(pageDir, { recursive: true });
          await llmLogger.log(`✅ Directory created/verified: ${pageDir}`);
        } catch (mkdirError) {
          await llmLogger.log(
            `⚠️ Directory creation issue: ${mkdirError.message}`
          );
        }

        // Check if file exists and delete it
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            await fs.unlink(filePath);
            await llmLogger.log(`🔄 Old file removed`);
          } else if (stats.isDirectory()) {
            await llmLogger.log(
              `❌ ERROR: page.js exists as DIRECTORY, removing it`
            );
            await fs.rmdir(filePath, { recursive: true });
          }
        } catch {
          await llmLogger.log(`✨ New file will be created`);
        }
      }

      // Write the new content with explicit flags
      await fs.writeFile(filePath, content, {
        encoding: "utf-8",
        flag: "w", // Force write mode
      });

      // Verify the write was successful
      const writtenContent = await fs.readFile(filePath, "utf-8");
      if (writtenContent !== content) {
        throw new Error("File write verification failed - content mismatch");
      }

      await llmLogger.log(
        `✅ Page created/updated successfully: ${displayPath}`
      );
      await llmLogger.log(`📊 Content length: ${content.length} characters`);

      // Update context
      await this.updateContextMetadata("page_created", displayPath);

      return {
        success: true,
        message: `Page created: ${displayPath}`,
        filePath: displayPath,
      };
    } catch (error) {
      await llmLogger.log(`❌ Failed to create page: ${error.message}`);
      await llmLogger.log(`Stack: ${error.stack}`);
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

      // Check if component exists
      let fileExists = false;
      try {
        await fs.access(filePath);
        fileExists = true;
        await llmLogger.log(`🔄 OVERWRITING existing component at ${filePath}`);
        await fs.unlink(filePath);
      } catch {
        await llmLogger.log(`📝 Creating NEW component at ${filePath}`);
      }

      // Write with explicit flags
      await fs.writeFile(filePath, content, {
        encoding: "utf-8",
        flag: "w",
      });

      // Verify write
      const writtenContent = await fs.readFile(filePath, "utf-8");
      if (writtenContent !== content) {
        throw new Error("File write verification failed - content mismatch");
      }

      await llmLogger.log(
        `✅ Component created/updated: components/${name}.js`
      );
      await llmLogger.log(`📊 Content length: ${content.length} characters`);

      // Update context
      await this.updateContextMetadata(
        "component_created",
        `components/${name}.js`
      );

      return {
        success: true,
        message: `Component created: components/${name}.js`,
        filePath: `components/${name}.js`,
      };
    } catch (error) {
      await llmLogger.log(`❌ Failed to create component: ${error.message}`);
      await llmLogger.log(`Stack: ${error.stack}`);
      return {
        error: `Failed to create component: ${error.message}`,
      };
    }
  }

  // NEW: Update context metadata
  async updateContextMetadata(action, details) {
    const context = await this.loadContextFromFile();
    if (context) {
      context.metadata.lastModified = new Date().toISOString();
      context.metadata.totalIterations =
        (context.metadata.totalIterations || 0) + 1;
      context.metadata.lastAction = action;
      context.metadata.lastDetails = details;
      await this.saveContextToFile(context);
    }
  }

  // NEW: Tool to update/add sections to existing pages
  async updatePage(params) {
    const { name, section, position = "before_closing" } = params;

    if (!name || !section) {
      return { error: "Missing required parameter: name or section" };
    }

    await llmLogger.log(`🔄 Updating page: ${name}`);

    const outputDir = path.join(__dirname, "output", "nextjs-project", "app");

    try {
      let filePath;
      let displayPath;

      if (name === "home" || name === "/" || name === "index") {
        filePath = path.join(outputDir, "page.js");
        displayPath = "app/page.js";
      } else {
        filePath = path.join(outputDir, name, "page.js");
        displayPath = `app/${name}/page.js`;
      }

      // Read existing content
      let existingContent;
      try {
        existingContent = await fs.readFile(filePath, "utf-8");
        await llmLogger.log(`📖 Read existing content from ${displayPath}`);
      } catch {
        return {
          error: `Page ${displayPath} does not exist. Use createPage instead.`,
        };
      }

      // Insert section at specified position
      let updatedContent;

      if (position === "before_closing") {
        // Insert before the last closing div/fragment
        const lastClosingIndex = existingContent.lastIndexOf("</");
        if (lastClosingIndex > 0) {
          updatedContent =
            existingContent.slice(0, lastClosingIndex) +
            "\n" +
            section +
            "\n" +
            existingContent.slice(lastClosingIndex);
        } else {
          return { error: "Could not find closing tag to insert section" };
        }
      } else if (position === "after_opening") {
        // Insert after first opening tag
        const firstClosingIndex = existingContent.indexOf(">");
        if (firstClosingIndex > 0) {
          updatedContent =
            existingContent.slice(0, firstClosingIndex + 1) +
            "\n" +
            section +
            "\n" +
            existingContent.slice(firstClosingIndex + 1);
        } else {
          return { error: "Could not find opening tag" };
        }
      } else if (position === "replace") {
        // Complete replacement
        updatedContent = section;
      } else {
        // Append at end
        updatedContent = existingContent + "\n" + section;
      }

      // Write updated content
      await fs.writeFile(filePath, updatedContent, {
        encoding: "utf-8",
        flag: "w",
      });

      await llmLogger.log(`✅ Page updated: ${displayPath}`);
      await this.updateContextMetadata("page_updated", displayPath);

      return {
        success: true,
        message: `Page updated: ${displayPath}`,
        filePath: displayPath,
      };
    } catch (error) {
      await llmLogger.log(`❌ Failed to update page: ${error.message}`);
      return {
        error: `Failed to update page: ${error.message}`,
      };
    }
  }

  // NEW: Tool to fix errors
  async fixError(params) {
    const { filePath, fix } = params;
    await llmLogger.log(`🔧 Fixing error in: ${filePath}`);

    try {
      const fullPath = path.join(
        __dirname,
        "output",
        "nextjs-project",
        filePath
      );
      const content = await fs.readFile(fullPath, "utf-8");

      // Apply the fix (you can make this more sophisticated)
      const fixedContent = content + "\n" + fix;

      await fs.writeFile(fullPath, fixedContent, "utf-8");

      return {
        success: true,
        message: `Fixed: ${filePath}`,
      };
    } catch (error) {
      return { error: `Failed to fix: ${error.message}` };
    }
  }

  // Initialize Next.js project structure
  async initializeNextProject() {
    console.log("🚀 Initializing new Next.js project structure...");
    const projectDir = path.join(__dirname, "output", "nextjs-project");

    try {
      await fs.mkdir(path.join(projectDir, "app"), { recursive: true });
      await fs.mkdir(path.join(projectDir, "components"), { recursive: true });
      await fs.mkdir(path.join(projectDir, "public"), { recursive: true });

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

module.exports = AIAgent;
