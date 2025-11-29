#!/usr/bin/env node
// scripts/migrate-setup.js - Creates folder structure and basic files

const fs = require("fs");
const path = require("path");

console.log("🚀 AI Agent Project Migration - Setup Script\n");

// Folder structure to create
const folders = [
  "src/config",
  "src/controllers",
  "src/routes",
  "src/services/agent",
  "src/services/claude",
  "src/services/kb",
  "src/services/nextjs",
  "src/middlewares",
  "src/utils",
  "src/validations",
  "tests/unit",
  "tests/integration",
  "tests/e2e",
  "scripts",
];

// Create backup
function createBackup() {
  console.log("📦 Creating backup...");

  if (fs.existsSync("server.js")) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `server.backup.${timestamp}.js`;
    fs.copyFileSync("server.js", backupName);
    console.log(`✅ Backup created: ${backupName}`);
  } else {
    console.log("⚠️  server.js not found, skipping backup");
  }

  // Backup other important files
  const filesToBackup = ["package.json", ".env"];
  filesToBackup.forEach((file) => {
    if (fs.existsSync(file)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.copyFileSync(file, `${file}.backup.${timestamp}`);
      console.log(`✅ Backup created: ${file}.backup.${timestamp}`);
    }
  });

  console.log("");
}

// Create folder structure
function createFolders() {
  console.log("📁 Creating folder structure...");

  folders.forEach((folder) => {
    const folderPath = path.join(__dirname, "..", folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`  ✅ Created: ${folder}`);
    } else {
      console.log(`  ⏭️  Exists: ${folder}`);
    }
  });

  console.log("");
}

// Create .env.example
function createEnvExample() {
  console.log("📄 Creating .env.example...");

  const envExample = `# Server Configuration
PORT=3001
NODE_ENV=development

# API Keys
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Logging
LOG_LEVEL=info
`;

  const envPath = path.join(__dirname, "..", ".env.example");
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envExample);
    console.log("  ✅ Created .env.example");
  } else {
    console.log("  ⏭️  .env.example already exists");
  }

  console.log("");
}

// Create .gitignore updates
function updateGitignore() {
  console.log("📄 Updating .gitignore...");

  const gitignorePath = path.join(__dirname, "..", ".gitignore");
  const gitignoreAdditions = `
# Backup files
*.backup.*

# Environment files
.env
.env.local
.env.*.local

# Logs
logs/
*.log

# Test coverage
coverage/

# IDE
.vscode/
.idea/
`;

  if (fs.existsSync(gitignorePath)) {
    const currentContent = fs.readFileSync(gitignorePath, "utf-8");
    if (!currentContent.includes("*.backup.*")) {
      fs.appendFileSync(gitignorePath, gitignoreAdditions);
      console.log("  ✅ Updated .gitignore");
    } else {
      console.log("  ⏭️  .gitignore already updated");
    }
  } else {
    fs.writeFileSync(gitignorePath, gitignoreAdditions.trim());
    console.log("  ✅ Created .gitignore");
  }

  console.log("");
}

// Create package.json script updates
function updatePackageJson() {
  console.log("📦 Updating package.json scripts...");

  const packagePath = path.join(__dirname, "..", "package.json");

  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    const newScripts = {
      dev: "nodemon src/server.js",
      start: "node src/server.js",
      "start:old": "node server.js",
      migrate: "node scripts/migrate.js",
      "migrate:setup": "node scripts/migrate-setup.js",
      "migrate:extract": "node scripts/migrate-extract.js",
      "migrate:verify": "node scripts/migrate-verify.js",
      test: 'echo "Tests not yet implemented" && exit 0',
      lint: "eslint src/",
      "lint:fix": "eslint src/ --fix",
    };

    packageJson.scripts = { ...packageJson.scripts, ...newScripts };

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log("  ✅ Updated package.json scripts");
  } else {
    console.log("  ⚠️  package.json not found");
  }

  console.log("");
}

// Print summary
function printSummary() {
  console.log("✅ Setup Complete!\n");
  console.log("📋 Next Steps:");
  console.log("  1. Run: npm run migrate:extract");
  console.log("  2. Run: npm run migrate:verify");
  console.log("  3. Run: npm run dev\n");
}

// Main execution
function main() {
  try {
    createBackup();
    createFolders();
    createEnvExample();
    updateGitignore();
    updatePackageJson();
    printSummary();
  } catch (error) {
    console.error("❌ Error during setup:", error.message);
    process.exit(1);
  }
}

main();
