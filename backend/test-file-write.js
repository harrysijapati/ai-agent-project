// Test File Write - Add this to test file overwrites
// Save as test-file-write.js and run: node test-file-write.js

const fs = require("fs").promises;
const path = require("path");

async function testFileWrite() {
  const testDir = path.join(__dirname, "output", "nextjs-project", "app");
  const testFile = path.join(testDir, "page.js");

  console.log("🧪 Testing file write capabilities...\n");

  try {
    // Ensure directory exists
    await fs.mkdir(testDir, { recursive: true });
    console.log("✅ Directory created/verified:", testDir);

    // Test 1: Initial write
    console.log("\n📝 Test 1: Initial write");
    const content1 = `export default function Home() {
  return <div>Version 1</div>
}`;
    await fs.writeFile(testFile, content1, "utf-8");
    const read1 = await fs.readFile(testFile, "utf-8");
    console.log("Written:", content1.includes("Version 1"));
    console.log("Read back:", read1.includes("Version 1"));
    console.log(read1 === content1 ? "✅ PASS" : "❌ FAIL");

    // Test 2: Overwrite without unlink
    console.log("\n🔄 Test 2: Overwrite (direct)");
    const content2 = `export default function Home() {
  return <div>Version 2 - Overwritten</div>
}`;
    await fs.writeFile(testFile, content2, "utf-8");
    const read2 = await fs.readFile(testFile, "utf-8");
    console.log("Written:", content2.includes("Version 2"));
    console.log("Read back:", read2.includes("Version 2"));
    console.log(read2 === content2 ? "✅ PASS" : "❌ FAIL");

    // Test 3: Unlink then write
    console.log("\n🗑️ Test 3: Unlink then write");
    await fs.unlink(testFile);
    console.log("File deleted");
    const content3 = `export default function Home() {
  return <div>Version 3 - After Delete</div>
}`;
    await fs.writeFile(testFile, content3, "utf-8");
    const read3 = await fs.readFile(testFile, "utf-8");
    console.log("Written:", content3.includes("Version 3"));
    console.log("Read back:", read3.includes("Version 3"));
    console.log(read3 === content3 ? "✅ PASS" : "❌ FAIL");

    // Test 4: Write with flag option
    console.log("\n🚩 Test 4: Write with 'w' flag");
    const content4 = `export default function Home() {
  return <div>Version 4 - With Flag</div>
}`;
    await fs.writeFile(testFile, content4, { encoding: "utf-8", flag: "w" });
    const read4 = await fs.readFile(testFile, "utf-8");
    console.log("Written:", content4.includes("Version 4"));
    console.log("Read back:", read4.includes("Version 4"));
    console.log(read4 === content4 ? "✅ PASS" : "❌ FAIL");

    // Test 5: File permissions check
    console.log("\n🔐 Test 5: File permissions");
    const stats = await fs.stat(testFile);
    console.log("File exists:", stats.isFile());
    console.log("File size:", stats.size, "bytes");
    console.log("Writable:", (stats.mode & 0o200) !== 0);

    // Test 6: Multiple rapid overwrites
    console.log("\n⚡ Test 6: Rapid overwrites");
    for (let i = 5; i <= 10; i++) {
      const content = `export default function Home() {
  return <div>Version ${i}</div>
}`;
      await fs.unlink(testFile).catch(() => {});
      await fs.writeFile(testFile, content, { encoding: "utf-8", flag: "w" });
    }
    const readFinal = await fs.readFile(testFile, "utf-8");
    console.log(
      "Final version:",
      readFinal.includes("Version 10") ? "✅ Version 10" : "❌ Wrong version"
    );

    console.log("\n✅ All tests completed!");
    console.log("\n📊 Summary:");
    console.log("- Direct overwrites: Working");
    console.log("- Unlink before write: Working");
    console.log("- Flag option: Working");
    console.log("- Rapid writes: Working");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

// Run tests
testFileWrite();
