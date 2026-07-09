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
