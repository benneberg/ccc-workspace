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

export async function readFile(filePath: string, workingDir: string = process.cwd()): Promise<ToolResult> {
  const start = Date.now();
  try {
    const fullPath = path.resolve(workingDir, filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return {
      success: true,
      tool: "readFile",
      data: { path: filePath, content },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: false,
      tool: "readFile",
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

export async function writeFile(filePath: string, content: string, workingDir: string = process.cwd()): Promise<ToolResult> {
  const start = Date.now();
  try {
    const check = await approvalManager.checkWriteApprovalNeeded(filePath, content, workingDir);
    if (check.needed) {
      console.log(`[writeFile] Approval needed for ${filePath}. Reason: ${check.reason}`);
      const approved = await approvalManager.requestApproval(filePath, content, check.reason);
      if (!approved) {
        return {
          success: false,
          tool: "writeFile",
          error: "Write operation rejected by user approval step.",
          duration_ms: Date.now() - start,
        };
      }
    }

    const fullPath = path.resolve(workingDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    return {
      success: true,
      tool: "writeFile",
      data: { path: filePath, content },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: false,
      tool: "writeFile",
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

export async function runCommand(command: string, workingDir: string = process.cwd()): Promise<ToolResult> {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execAsync(command, { cwd: workingDir });
    return {
      success: true,
      tool: "runCommand",
      data: { stdout, stderr },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: false,
      tool: "runCommand",
      error: error.message,
      data: { stdout: error.stdout, stderr: error.stderr },
      duration_ms: Date.now() - start,
    };
  }
}

export async function search(pattern: string, glob?: string, workingDir: string = process.cwd()): Promise<ToolResult> {
  const start = Date.now();
  try {
    const globCmd = glob ? `--include="${glob}"` : "";
    const { stdout, stderr } = await execAsync(`grep -rnE "${pattern}" . ${globCmd} --exclude-dir={node_modules,dist,.git} | head -n 50`, { cwd: workingDir });
    return {
      success: true,
      tool: "search",
      data: { results: stdout, stderr },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: false,
      tool: "search",
      error: error.message,
      data: { stdout: error.stdout, stderr: error.stderr },
      duration_ms: Date.now() - start,
    };
  }
}

export async function findFiles(pattern: string = "*", workingDir: string = process.cwd()): Promise<ToolResult> {
  const start = Date.now();
  try {
    const { stdout, stderr } = await execAsync(`find . -name "${pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -n 100`, { cwd: workingDir });
    return {
      success: true,
      tool: "findFiles",
      data: { results: stdout },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: false,
      tool: "findFiles",
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

export async function listFiles(dirPath: string = ".", workingDir: string = process.cwd()): Promise<ToolResult> {
  const start = Date.now();
  try {
    const fullPath = path.resolve(workingDir, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files = entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(dirPath, e.name)
    })).filter(e => !e.name.startsWith(".") && e.name !== "node_modules");

    return {
      success: true,
      tool: "listFiles",
      data: { path: dirPath, files },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: false,
      tool: "listFiles",
      error: error.message,
      duration_ms: Date.now() - start,
    };
  }
}

export async function gitStatus(workingDir: string = process.cwd()): Promise<ToolResult> {
  const start = Date.now();
  try {
    const { stdout } = await execAsync("git status", { cwd: workingDir });
    return {
      success: true,
      tool: "gitStatus",
      data: { status: stdout || "Working tree clean" },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: true,
      tool: "gitStatus",
      data: { status: error.stdout || error.stderr || error.message || "Not a git repository" },
      duration_ms: Date.now() - start,
    };
  }
}

export async function gitDiff(cached: boolean = false, workingDir: string = process.cwd()): Promise<ToolResult> {
  const start = Date.now();
  try {
    const cmd = cached ? "git diff --cached" : "git diff";
    const { stdout } = await execAsync(cmd, { cwd: workingDir });
    return {
      success: true,
      tool: "gitDiff",
      data: { diff: stdout || "No uncommitted diffs" },
      duration_ms: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: true,
      tool: "gitDiff",
      data: { diff: error.stdout || error.stderr || error.message || "No diff available" },
      duration_ms: Date.now() - start,
    };
  }
}

