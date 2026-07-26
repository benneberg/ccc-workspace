import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { approvalManager } from "../approvalManager.ts";

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  tool: string;
  data?: any;
  error?: string | null;
  duration_ms: number;
}

export interface ToolLogEntry {
  id: string;
  timestamp: string;
  tool: string;
  args: any;
  success: boolean;
  duration_ms: number;
  error?: string | null;
}

export interface ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  schema: T;
  requiresApproval?: boolean | ((args: z.infer<T>, workingDir: string) => Promise<boolean>);
  permissionCheck?: (args: z.infer<T>, workingDir: string) => Promise<{ allowed: boolean; reason?: string }>;
  execute: (args: z.infer<T>, workingDir: string) => Promise<any>;
}

export class ToolOrchestrator {
  private tools = new Map<string, ToolDefinition>();
  private logs: ToolLogEntry[] = [];
  private allowedDirectories: string[] = [];

  constructor() {
    // Default to allowing the workspace root and mounted repos
    this.allowedDirectories = [process.cwd(), path.resolve(process.cwd(), "mounted_repos")];
  }

  /**
   * Register a new tool with the orchestrator
   */
  register<T extends z.ZodTypeAny>(tool: ToolDefinition<T>) {
    this.tools.set(tool.name, tool as any);
    console.log(`[ToolOrchestrator] Registered tool: ${tool.name}`);
  }

  /**
   * Check if a filepath is within allowed directory scopes (prevent traversal outside the workspace)
   */
  async isPathAllowed(filePath: string, workingDir: string): Promise<boolean> {
    try {
      const resolvedTarget = path.resolve(workingDir, filePath);
      
      // Resolve symlinks to prevent evasion
      const realTarget = await fs.realpath(resolvedTarget).catch(() => resolvedTarget);

      // Check if target starts with process.cwd() or any allowed directory
      const isAllowed = this.allowedDirectories.some(allowedDir => {
        const resolvedAllowed = path.resolve(allowedDir);
        return realTarget.startsWith(resolvedAllowed) || realTarget === resolvedAllowed;
      });

      return isAllowed;
    } catch {
      // If we can't resolve, default to strict relative safety (no ".." sequences leaving process.cwd())
      const relative = path.relative(process.cwd(), path.resolve(workingDir, filePath));
      return !relative.startsWith("..") && !path.isAbsolute(relative);
    }
  }

  /**
   * Run a registered tool with validation, permission, and logging
   */
  async execute(toolName: string, args: any, workingDir: string = process.cwd()): Promise<ToolResult> {
    const start = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        tool: toolName,
        error: `Tool '${toolName}' is not registered in the orchestrator.`,
        duration_ms: Date.now() - start,
      };
    }

    try {
      // 1. Schema Validation via Zod
      const parseResult = tool.schema.safeParse(args);
      if (!parseResult.success) {
        const validationError = parseResult.error.issues
          .map((e) => `[${e.path.join(".") || "args"}]: ${e.message}`)
          .join(", ");
        
        return this.logAndReturn(start, {
          success: false,
          tool: toolName,
          error: `Schema validation failed: ${validationError}`,
          duration_ms: Date.now() - start,
        }, args);
      }

      const validatedArgs = parseResult.data;

      // 2. Permission Verification
      if (tool.permissionCheck) {
        const check = await tool.permissionCheck(validatedArgs, workingDir);
        if (!check.allowed) {
          return this.logAndReturn(start, {
            success: false,
            tool: toolName,
            error: `Permission Denied: ${check.reason || "Unauthorized operation."}`,
            duration_ms: Date.now() - start,
          }, validatedArgs);
        }
      }

      // 3. Optional Human-in-the-Loop Security Gate
      let approvalNeeded = false;
      if (tool.requiresApproval) {
        if (typeof tool.requiresApproval === "function") {
          approvalNeeded = await (tool.requiresApproval as any)(validatedArgs, workingDir);
        } else {
          approvalNeeded = tool.requiresApproval;
        }
      }

      if (approvalNeeded) {
        const desc = `Approval requested for destructive/substantial action in '${toolName}'`;
        const argsAny = validatedArgs as any;
        const approved = await approvalManager.requestApproval(
          argsAny.filePath || argsAny.path || "workspace",
          JSON.stringify(validatedArgs, null, 2),
          desc
        );
        if (!approved) {
          return this.logAndReturn(start, {
            success: false,
            tool: toolName,
            error: "Operation cancelled: Approval rejected by user.",
            duration_ms: Date.now() - start,
          }, validatedArgs);
        }
      }

      // 4. Execution
      const executionResult = await tool.execute(validatedArgs, workingDir);
      
      return this.logAndReturn(start, {
        success: true,
        tool: toolName,
        data: executionResult,
        duration_ms: Date.now() - start,
      }, validatedArgs);

    } catch (error: any) {
      return this.logAndReturn(start, {
        success: false,
        tool: toolName,
        error: error.message || "An unexpected error occurred during execution.",
        duration_ms: Date.now() - start,
      }, args);
    }
  }

  /**
   * Helper to write logs and return the structured response
   */
  private logAndReturn(start: number, result: ToolResult, args: any): ToolResult {
    const logEntry: ToolLogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      tool: result.tool,
      args,
      success: result.success,
      duration_ms: result.duration_ms,
      error: result.error,
    };
    
    this.logs.push(logEntry);
    
    // Log output to standard output for audits
    console.log(`[ToolOrchestrator] Call: ${result.tool} | Success: ${result.success} | Duration: ${result.duration_ms}ms`);
    if (!result.success) {
      console.warn(`[ToolOrchestrator] Error: ${result.error}`);
    }

    return result;
  }

  /**
   * Get all call logs
   */
  getLogs(): ToolLogEntry[] {
    return this.logs;
  }

  /**
   * Clear call logs
   */
  clearLogs() {
    this.logs = [];
  }
}

export const orchestrator = new ToolOrchestrator();

// ==========================================
// CORE TOOL REGISTRATIONS
// ==========================================

// 1. readFile
orchestrator.register({
  name: "readFile",
  description: "Reads the complete UTF-8 contents of a file.",
  schema: z.object({
    filePath: z.string().min(1, "filePath must not be empty"),
  }),
  permissionCheck: async (args, workingDir) => {
    const isAllowed = await orchestrator.isPathAllowed(args.filePath, workingDir);
    return {
      allowed: isAllowed,
      reason: isAllowed ? undefined : `File path '${args.filePath}' lies outside the allowed directory bounds.`
    };
  },
  execute: async (args, workingDir) => {
    const fullPath = path.resolve(workingDir, args.filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return { path: args.filePath, content };
  }
});

// 2. writeFile
orchestrator.register({
  name: "writeFile",
  description: "Writes content to a file, prompting for approvals if overwriting or creating large contents.",
  schema: z.object({
    filePath: z.string().min(1, "filePath must not be empty"),
    content: z.string(),
  }),
  permissionCheck: async (args, workingDir) => {
    const isAllowed = await orchestrator.isPathAllowed(args.filePath, workingDir);
    return {
      allowed: isAllowed,
      reason: isAllowed ? undefined : `File path '${args.filePath}' lies outside the allowed directory bounds.`
    };
  },
  requiresApproval: async (args, workingDir) => {
    const check = await approvalManager.checkWriteApprovalNeeded(args.filePath, args.content, workingDir);
    return check.needed;
  },
  execute: async (args, workingDir) => {
    const fullPath = path.resolve(workingDir, args.filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, args.content, "utf-8");
    return { path: args.filePath, content: args.content };
  }
});

// 3. applyPatch
orchestrator.register({
  name: "applyPatch",
  description: "Applies a unified diff or find/replace block patch to a specified file.",
  schema: z.object({
    filePath: z.string().min(1, "filePath must not be empty"),
    patch: z.string().min(1, "patch content must not be empty"),
  }),
  permissionCheck: async (args, workingDir) => {
    const isAllowed = await orchestrator.isPathAllowed(args.filePath, workingDir);
    return {
      allowed: isAllowed,
      reason: isAllowed ? undefined : `File path '${args.filePath}' lies outside the allowed directory bounds.`
    };
  },
  requiresApproval: async () => {
    // Patches are modification of files, so they always go through a verification gate
    return true;
  },
  execute: async (args, workingDir) => {
    const fullPath = path.resolve(workingDir, args.filePath);
    const exists = await fs.access(fullPath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error(`File '${args.filePath}' does not exist to be patched.`);
    }

    const currentContent = await fs.readFile(fullPath, "utf-8");

    // Let's attempt two patch types:
    // A. Unified Diff parsing (via patch command if possible)
    // B. Custom SEARCH / REPLACE blocks
    if (args.patch.includes("<<<<<<<") || args.patch.includes("=======") || (args.patch.includes("<<<<") && args.patch.includes("====="))) {
      // Conflict marker style search/replace
      throw new Error("Conflict marker format detected. Please provide standard Search/Replace blocks or a unified diff.");
    }

    // Try applying simple block-based search & replace if it contains <<<< SEARCH / ==== / >>>> REPLACE
    if (args.patch.includes("SEARCH") && args.patch.includes("REPLACE")) {
      const searchBlocks = args.patch.split(/<<<<<<<\s*SEARCH/);
      let updatedContent = currentContent;

      for (let i = 1; i < searchBlocks.length; i++) {
        const parts = searchBlocks[i].split("=======");
        if (parts.length < 2) continue;
        const searchStr = parts[0].trim();
        const replaceParts = parts[1].split(/>>>>>>>/);
        const replaceStr = replaceParts[0].trim();

        if (updatedContent.includes(searchStr)) {
          updatedContent = updatedContent.replace(searchStr, replaceStr);
        } else {
          // Attempt fuzzy whitespace search
          const normalizedSearch = searchStr.replace(/\s+/g, " ");
          // Basic heuristic placeholder
          throw new Error(`Could not find the precise SEARCH block in file '${args.filePath}':\n${searchStr}`);
        }
      }

      await fs.writeFile(fullPath, updatedContent, "utf-8");
      return { path: args.filePath, status: "patched", content: updatedContent };
    }

    // If it is a Unified Diff format (contains --- and +++ headers)
    if (args.patch.includes("---") && args.patch.includes("+++")) {
      // Write the patch to a temporary file
      const tempPatchPath = path.resolve(workingDir, `.temp-${Date.now()}.patch`);
      await fs.writeFile(tempPatchPath, args.patch, "utf-8");

      try {
        // Run system patch command
        await execAsync(`patch "${fullPath}" "${tempPatchPath}"`);
        const patchedContent = await fs.readFile(fullPath, "utf-8");
        return { path: args.filePath, status: "patched", content: patchedContent };
      } catch (patchErr: any) {
        throw new Error(`System patch failed to apply: ${patchErr.stderr || patchErr.message}`);
      } finally {
        await fs.rm(tempPatchPath, { force: true });
      }
    }

    // Fallback: search and replace line-by-line if it's a simple search/replace replacement
    throw new Error("Unsupported patch format. Please use unified diff format or standard <<<<<<< SEARCH / ======= / >>>>>>> REPLACE blocks.");
  }
});

// 4. runCommand
orchestrator.register({
  name: "runCommand",
  description: "Executes a shell command within the workspace directory with security filtering.",
  schema: z.object({
    command: z.string().min(1, "command must not be empty"),
  }),
  permissionCheck: async (args) => {
    const cmd = args.command.trim().toLowerCase();
    // Block dangerous destructive system commands
    const forbiddenPatterns = ["rm -rf /", "rm -rf ~", "mkfs", "dd if=", "> /dev/sd", "shutdown", "reboot", ":(){ :|:& };:"];
    for (const pattern of forbiddenPatterns) {
      if (cmd.includes(pattern)) {
        return {
          allowed: false,
          reason: `Command execution blocked: dangerous pattern '${pattern}' detected.`
        };
      }
    }
    return { allowed: true };
  },
  execute: async (args, workingDir) => {
    const { stdout, stderr } = await execAsync(args.command, { cwd: workingDir });
    return { stdout, stderr };
  }
});

// 5. search
orchestrator.register({
  name: "search",
  description: "Search for text patterns using grep.",
  schema: z.object({
    pattern: z.string().min(1, "search pattern must not be empty"),
    glob: z.string().optional(),
  }),
  execute: async (args, workingDir) => {
    const globCmd = args.glob ? `--include="${args.glob}"` : "";
    const { stdout, stderr } = await execAsync(`grep -rnE "${args.pattern}" . ${globCmd} --exclude-dir={node_modules,dist,.git} | head -n 50`, { cwd: workingDir });
    return { results: stdout, stderr };
  }
});

// 6. listFiles
orchestrator.register({
  name: "listFiles",
  description: "List contents of a directory within the workspace.",
  schema: z.object({
    dirPath: z.string().default("."),
  }),
  permissionCheck: async (args, workingDir) => {
    const isAllowed = await orchestrator.isPathAllowed(args.dirPath, workingDir);
    return {
      allowed: isAllowed,
      reason: isAllowed ? undefined : `Directory path '${args.dirPath}' lies outside allowed workspace bounds.`
    };
  },
  execute: async (args, workingDir) => {
    const fullPath = path.resolve(workingDir, args.dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files = entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(args.dirPath, e.name)
    })).filter(e => !e.name.startsWith(".") && e.name !== "node_modules");

    return { path: args.dirPath, files };
  }
});

// 7. findFiles
orchestrator.register({
  name: "findFiles",
  description: "Find files matching a glob pattern.",
  schema: z.object({
    pattern: z.string().default("*"),
  }),
  execute: async (args, workingDir) => {
    const { stdout } = await execAsync(`find . -name "${args.pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -n 100`, { cwd: workingDir });
    return { results: stdout };
  }
});

// 8. gitStatus
orchestrator.register({
  name: "gitStatus",
  description: "Retrieve working directory git status.",
  schema: z.object({}),
  execute: async (_, workingDir) => {
    const { stdout } = await execAsync("git status", { cwd: workingDir }).catch((e) => ({ stdout: e.stdout || e.message }));
    return { status: stdout || "Working tree clean" };
  }
});

// 9. gitDiff
orchestrator.register({
  name: "gitDiff",
  description: "Get repository diff for staged or unstaged changes.",
  schema: z.object({
    cached: z.boolean().optional(),
  }),
  execute: async (args, workingDir) => {
    const cmd = args.cached ? "git diff --cached" : "git diff";
    const { stdout } = await execAsync(cmd, { cwd: workingDir }).catch((e) => ({ stdout: e.stdout || e.message }));
    return { diff: stdout || "No uncommitted diffs" };
  }
});

// 10. gitCommit
orchestrator.register({
  name: "gitCommit",
  description: "Create a git commit with a semantic commit message.",
  schema: z.object({
    message: z.string().min(1, "Commit message cannot be empty"),
  }),
  requiresApproval: true,
  execute: async (args, workingDir) => {
    await execAsync("git add -A", { cwd: workingDir });
    const { stdout } = await execAsync(`git commit -m "${args.message.replace(/"/g, '\\"')}"`, { cwd: workingDir });
    return { status: "committed", stdout };
  }
});

// 11. saveMemory
orchestrator.register({
  name: "saveMemory",
  description: "Save a persistent memory entry for the repository.",
  schema: z.object({
    content: z.string().min(1, "Memory content cannot be empty"),
    tags: z.array(z.string()).optional(),
  }),
  execute: async (args, workingDir) => {
    const repoName = path.basename(workingDir);
    const { memoryService } = await import("../memory.ts");
    return await memoryService.saveMemory(repoName, args);
  }
});

// 12. searchMemory
orchestrator.register({
  name: "searchMemory",
  description: "Search persistent repository memory.",
  schema: z.object({
    query: z.string().min(1, "Search query cannot be empty"),
  }),
  execute: async (args, workingDir) => {
    const repoName = path.basename(workingDir);
    const { memoryService } = await import("../memory.ts");
    return await memoryService.searchMemory(repoName, args.query);
  }
});

