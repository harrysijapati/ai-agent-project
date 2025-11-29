// src/utils/file.util.js
const fs = require("fs").promises;
const path = require("path");

class FileUtil {
  /**
   * Read file recursively from directory
   */
  static async getFilesRecursively(
    dir,
    excludeDirs = ["node_modules", ".next"]
  ) {
    const files = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (excludeDirs.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursively(
            fullPath,
            excludeDirs
          );
          files.push(...subFiles);
        } else {
          const content = await fs.readFile(fullPath, "utf-8");
          const relativePath = fullPath.replace(dir + path.sep, "");
          files.push({ path: relativePath, content });
        }
      }
    } catch (error) {
      // Directory doesn't exist
    }
    return files;
  }

  /**
   * Build tree structure from directory
   */
  static async buildTree(
    dir,
    basePath = "",
    excludeDirs = ["node_modules", ".next"]
  ) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const tree = [];

    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) continue;

      const relativePath = path.join(basePath, entry.name);
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        tree.push({
          name: entry.name,
          type: "directory",
          path: relativePath,
          children: await this.buildTree(fullPath, relativePath, excludeDirs),
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
  }

  /**
   * Ensure directory exists
   */
  static async ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * Safe file write with verification
   */
  static async safeWriteFile(filePath, content, options = {}) {
    try {
      // Delete if exists
      try {
        await fs.unlink(filePath);
      } catch {}

      // Write new content
      await fs.writeFile(filePath, content, {
        encoding: "utf-8",
        flag: "w",
        ...options,
      });

      // Verify
      const written = await fs.readFile(filePath, "utf-8");
      if (written !== content) {
        throw new Error("File write verification failed");
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }
}

module.exports = FileUtil;
