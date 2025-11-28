// Cleanup Utility - Fixes corrupted project structure
// Save as cleanup.js and run: node cleanup.js

const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

async function cleanupProject() {
  const projectDir = path.join(__dirname, "output", "nextjs-project");
  const appDir = path.join(projectDir, "app");

  console.log("🧹 Starting cleanup...\n");

  try {
    // Check if project exists
    try {
      await fs.access(projectDir);
      console.log("✅ Project directory found:", projectDir);
    } catch {
      console.log("❌ No project directory found. Nothing to clean.");
      return;
    }

    // Check app directory
    try {
      await fs.access(appDir);
      console.log("✅ App directory found:", appDir);
    } catch {
      console.log("⚠️ No app directory found. Creating it...");
      await fs.mkdir(appDir, { recursive: true });
      console.log("✅ App directory created");
      return;
    }

    // Scan for issues
    console.log("\n🔍 Scanning for issues...\n");

    const entries = await fs.readdir(appDir, { withFileTypes: true });
    let issuesFound = 0;

    for (const entry of entries) {
      const fullPath = path.join(appDir, entry.name);

      // Issue 1: page.js as a directory (CRITICAL BUG)
      if (entry.name === "page.js" && entry.isDirectory()) {
        console.log(`❌ ISSUE FOUND: page.js exists as DIRECTORY`);
        console.log(`   Path: ${fullPath}`);
        console.log(`   Fixing: Removing directory...`);

        try {
          // Remove the directory
          await fs.rmdir(fullPath, { recursive: true });
          console.log(`   ✅ Directory removed successfully`);
          issuesFound++;
        } catch (err) {
          console.log(`   ❌ Failed to remove: ${err.message}`);
        }
      }

      // Issue 2: Check for files that should be directories
      if (
        entry.isFile() &&
        entry.name !== "page.js" &&
        entry.name !== "layout.js" &&
        entry.name !== "globals.css"
      ) {
        console.log(`⚠️ Unexpected file in app root: ${entry.name}`);
        console.log(`   This might be a page directory that's a file`);
      }

      // Issue 3: Check subdirectories for page.js directories
      if (
        entry.isDirectory() &&
        !["node_modules", ".next"].includes(entry.name)
      ) {
        const subPath = path.join(fullPath, "page.js");
        try {
          const subStat = await fs.stat(subPath);
          if (subStat.isDirectory()) {
            console.log(`❌ ISSUE FOUND: ${entry.name}/page.js is a DIRECTORY`);
            console.log(`   Path: ${subPath}`);
            console.log(`   Fixing: Removing directory...`);

            try {
              await fs.rmdir(subPath, { recursive: true });
              console.log(`   ✅ Directory removed successfully`);
              issuesFound++;
            } catch (err) {
              console.log(`   ❌ Failed to remove: ${err.message}`);
            }
          }
        } catch {
          // page.js doesn't exist in this directory, that's fine
        }
      }
    }

    // Check components directory
    const componentsDir = path.join(projectDir, "components");
    try {
      await fs.access(componentsDir);
      const compEntries = await fs.readdir(componentsDir, {
        withFileTypes: true,
      });

      for (const entry of compEntries) {
        if (entry.isDirectory() && entry.name.endsWith(".js")) {
          console.log(`❌ ISSUE FOUND: Component ${entry.name} is a DIRECTORY`);
          console.log(`   Path: ${path.join(componentsDir, entry.name)}`);
          console.log(`   Fixing: Removing directory...`);

          try {
            await fs.rmdir(path.join(componentsDir, entry.name), {
              recursive: true,
            });
            console.log(`   ✅ Directory removed successfully`);
            issuesFound++;
          } catch (err) {
            console.log(`   ❌ Failed to remove: ${err.message}`);
          }
        }
      }
    } catch {
      console.log("⚠️ No components directory found");
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Issues found: ${issuesFound}`);
    console.log(`   Issues fixed: ${issuesFound}`);

    if (issuesFound === 0) {
      console.log("\n✅ No issues found! Project structure is clean.");
    } else {
      console.log("\n✅ All issues fixed! Project structure cleaned.");
      console.log("\n💡 You can now regenerate your project safely.");
    }

    // Show current structure
    console.log("\n📂 Current app directory structure:");
    await showStructure(appDir, "");
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

async function showStructure(dir, indent) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (["node_modules", ".next"].includes(entry.name)) continue;

      const icon = entry.isDirectory() ? "📁" : "📄";
      console.log(
        `${indent}${icon} ${entry.name} ${
          entry.isDirectory() ? "(DIR)" : "(FILE)"
        }`
      );

      if (entry.isDirectory() && indent.length < 6) {
        // Limit depth
        await showStructure(path.join(dir, entry.name), indent + "  ");
      }
    }
  } catch (err) {
    console.log(`${indent}❌ Error reading directory: ${err.message}`);
  }
}

// Additional cleanup function
async function nukeCaches() {
  console.log("\n🧨 Nuclear option: Removing .next and node_modules...");

  const projectDir = path.join(__dirname, "output", "nextjs-project");
  const nextDir = path.join(projectDir, ".next");
  const nodeModules = path.join(projectDir, "node_modules");

  try {
    await fs.rmdir(nextDir, { recursive: true });
    console.log("✅ .next removed");
  } catch {
    console.log("⚠️ .next not found or already removed");
  }

  try {
    await fs.rmdir(nodeModules, { recursive: true });
    console.log("✅ node_modules removed");
  } catch {
    console.log("⚠️ node_modules not found or already removed");
  }

  console.log(
    "\n💡 Run 'npm install' in the project directory to reinstall dependencies"
  );
}

// Run cleanup
(async () => {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   AI Agent Project Cleanup Utility    ║");
  console.log("╚════════════════════════════════════════╝\n");

  await cleanupProject();

  // Ask if user wants nuclear option
  console.log("\n❓ Do you want to also remove .next and node_modules?");
  console.log("   (Run manually with: node cleanup.js --nuke)");

  if (process.argv.includes("--nuke")) {
    await nukeCaches();
  }

  console.log("\n✅ Cleanup complete!");
})();
