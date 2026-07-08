import fs from "fs/promises";
import path from "path";
import { ccc } from "./ccc.ts";

const MEMORY_DIR = path.resolve(process.cwd(), "data", "memory");

interface MemoryEntry {
  id: string;
  repo: string;
  content: string;
  tags: string[];
  lastUsed: string;
}

export const memoryService = {
  init: async () => {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    await fs.mkdir(path.join(MEMORY_DIR, "repositories"), { recursive: true });
    await fs.mkdir(path.join(MEMORY_DIR, "sessions"), { recursive: true });
  },

  saveMemory: async (repo: string, entry: Partial<MemoryEntry>) => {
    const id = Date.now().toString();
    const fullEntry: MemoryEntry = {
      id,
      repo,
      content: entry.content || "",
      tags: entry.tags || [],
      lastUsed: new Date().toISOString(),
    };

    const filePath = path.join(MEMORY_DIR, "repositories", `${repo}_${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(fullEntry, null, 2));
    return fullEntry;
  },

  searchMemory: async (repo: string, query: string) => {
    const dir = path.join(MEMORY_DIR, "repositories");
    const files = await fs.readdir(dir);
    const results: MemoryEntry[] = [];

    for (const file of files) {
      if (file.startsWith(repo)) {
        const content = await fs.readFile(path.join(dir, file), "utf-8");
        const entry: MemoryEntry = JSON.parse(content);
        if (entry.content.toLowerCase().includes(query.toLowerCase()) || 
            entry.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))) {
          results.push(entry);
        }
      }
    }

    // Augment with CCC results
    try {
      const cccResults = await ccc.query(query, "semantic");
      // Add a virtual entry for CCC results
      if (cccResults && (cccResults as any).length > 0) {
        results.push({
          id: "ccc-augmentation",
          repo,
          content: `CCC Insights: ${JSON.stringify(cccResults)}`,
          tags: ["ccc-augmented"],
          lastUsed: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("CCC Query failed during memory search", e);
    }

    return results;
  }
};
