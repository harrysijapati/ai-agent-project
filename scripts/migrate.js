#!/usr/bin/env node
// scripts/migrate.js - Master migration script

const { execSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function runCommand(command, description) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running: ${description}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(`\n❌ Error running: ${description}`);
    return false;
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 AI Agent Project - Automated Migration              ║
║                                                           ║
║   This script will refactor your server.js into a        ║
║   clean, maintainable structure.                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

  console.log("\n📋 Migration Steps:\n");
  console.log("  1. ✅ Setup - Create folder structure & backups");
  console.log("  2. 🔧 Extract - Create config, utils, and stubs");
  console.log("  3. ⚙️  Manual - Copy AIAgent class (you do this)");
  console.log("  4. 🧪 Verify - Run automated tests");
  console.log("  5. 🎉 Done - Ready to use!\n");

  const proceed = await ask(
    "📌 Ready to start? This will backup your files. (y/n): "
  );

  if (proceed.toLowerCase() !== "y") {
    console.log("\n❌ Migration cancelled.");
    rl.close();
    return;
  }

  // Step 1: Setup
  console.log("\n\n🚀 STEP 1: Setup\n");
  const setupSuccess = runCommand(
    "node scripts/migrate-setup.js",
    "Creating structure and backups"
  );

  if (!setupSuccess) {
    console.log("\n❌ Setup failed. Please check the errors above.");
    rl.close();
    return;
  }

  const continueExtract = await ask(
    "\n✅ Setup complete! Continue to extraction? (y/n): "
  );

  if (continueExtract.toLowerCase() !== "y") {
    console.log("\n⏸  Paused. Run: npm run migrate:extract to continue");
    rl.close();
    return;
  }

  // Step 2: Extract
  console.log("\n\n🔧 STEP 2: Extract Files\n");
  const extractSuccess = runCommand(
    "node scripts/migrate-extract.js",
    "Extracting code into new files"
  );

  if (!extractSuccess) {
    console.log("\n❌ Extraction failed. Please check the errors above.");
    rl.close();
    return;
  }

  // Step 3: Manual work
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("⚙️  STEP 3: Manual Work Required");
  console.log("=".repeat(60));
  console.log(`
📝 You need to manually copy some code:

1. Open your original server.js

2. Find the "class AIAgent" section (around line 50-800)

3. Copy the ENTIRE class including:
   - constructor()
   - execute()
   - reason()
   - act()
   - createPage()
   - createComponent()
   - All other methods

4. Paste into: src/services/agent/AIAgent.service.js
   (Replace the stub that's there)

5. Update the imports at the top:
   const logger = require('../../utils/logger.util');
   const config = require('../../config');

6. Save the file

7. Come back here and press Enter

⏸  Paused - Complete the manual work above, then press Enter...
`);

  await ask("");

  // Step 4: Verify
  const runVerify = await ask(
    "\n✅ Manual work done! Run verification tests? (y/n): "
  );

  if (runVerify.toLowerCase() === "y") {
    console.log("\n\n🧪 STEP 4: Verification\n");
    runCommand("node scripts/migrate-verify.js", "Verifying migration");
  }

  // Done
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("🎉 Migration Process Complete!");
  console.log("=".repeat(60));
  console.log(`
📚 Next Steps:

1. Review the verification results above

2. Start the new server:
   npm run dev

3. Test your application:
   - Visit: http://localhost:3001/health
   - Test: curl http://localhost:3001/api/status
   - Generate a project to verify everything works

4. If everything works:
   - Keep the backup files for now
   - Update your documentation
   - Commit the changes

5. If something doesn't work:
   - Run old server: npm run start:old
   - Check: MIGRATION_INSTRUCTIONS.md
   - Fix issues and run: npm run migrate:verify

📖 Documentation:
   - MIGRATION.md - Overview
   - MIGRATION_INSTRUCTIONS.md - Detailed steps

🔙 Rollback:
   - Your original files are backed up
   - Look for files with .backup.* extension

💡 Need Help?
   - Check logs in logs/llm.log
   - Run: npm run migrate:verify
   - Review error messages carefully

Good luck! 🚀
`);

  rl.close();
}

main().catch((error) => {
  console.error("\n❌ Migration error:", error.message);
  rl.close();
  process.exit(1);
});
