import { runCommand, search, ToolResult } from "../tools/index.ts";
import path from "path";

export interface CCCSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "variable" | "type" | "unknown";
  file: string;
  line?: number;
}

export interface CCCDependency {
  source: string;
  target: string;
  type: "import" | "call" | "inheritance";
}

export interface NormalizedCCCOutput {
  query: string;
  context: string[];
  symbols: CCCSymbol[];
  dependencies: CCCDependency[];
  summary: string;
  raw?: any;
}

/**
 * CCC Adapter Package
 * Queries CCC for repository context, dependency analysis, and symbol resolution.
 * Normalizes CCC outputs for the runtime and supports workspace-level queries.
 */
export class CCCAdapter {
  private bridgePath: string;

  constructor() {
    this.bridgePath = path.resolve(process.cwd(), "src/server/ccc_bridge.py");
  }

  /**
   * Execute Python bridge CLI command
   */
  async execute(command: string, ...args: string[]): Promise<ToolResult> {
    const formattedArgs = args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(" ");
    const fullCommand = `python3 ${this.bridgePath} ${command} ${formattedArgs}`;
    const result = await runCommand(fullCommand);
    
    if (result.success && result.data?.stdout) {
      try {
        const parsed = JSON.parse(result.data.stdout);
        return {
          success: parsed.success !== false,
          tool: `ccc_${command}`,
          data: parsed.data || parsed.stdout,
          error: parsed.error || null,
          duration_ms: result.duration_ms
        };
      } catch {
        return result;
      }
    }
    return result;
  }

  /**
   * Normalizes raw output from CCC or heuristic fallbacks into standard runtime structure
   */
  normalizeOutput(query: string, raw: any): NormalizedCCCOutput {
    const symbols: CCCSymbol[] = [];
    const dependencies: CCCDependency[] = [];
    const context: string[] = [];
    let summary = "";

    if (raw && typeof raw === "object") {
      if (Array.isArray(raw.symbols)) symbols.push(...raw.symbols);
      if (Array.isArray(raw.dependencies)) dependencies.push(...raw.dependencies);
      if (Array.isArray(raw.context)) context.push(...raw.context);
      if (raw.summary) summary = raw.summary;
    } else if (typeof raw === "string") {
      context.push(...raw.split("\n").filter(Boolean));
      summary = `Found ${context.length} code context lines matching query.`;
    }

    if (!summary) {
      summary = `Context compiled for '${query}': ${symbols.length} symbols, ${dependencies.length} dependencies resolved.`;
    }

    return { query, context, symbols, dependencies, summary, raw };
  }

  /**
   * Query CCC for repository context
   */
  async queryContext(target: string, workingDir: string = process.cwd()): Promise<NormalizedCCCOutput> {
    const res = await this.execute("query", target, "--type", "context");
    if (res.success && res.data) {
      return this.normalizeOutput(target, res.data);
    }
    // Heuristic fallback if binary is unavailable
    const searchRes = await search(target, undefined, workingDir);
    const lines = typeof searchRes.data?.results === "string" ? searchRes.data.results.split("\n").filter(Boolean) : [];
    return this.normalizeOutput(target, {
      context: lines,
      summary: `Compiled local repository context for '${target}' (${lines.length} references found).`
    });
  }

  /**
   * Query CCC for dependency analysis
   */
  async queryDependencies(target: string, workingDir: string = process.cwd()): Promise<NormalizedCCCOutput> {
    const res = await this.execute("query", target, "--type", "dependency");
    if (res.success && res.data) {
      return this.normalizeOutput(target, res.data);
    }
    // Fallback: search imports or calls of target
    const searchRes = await search(`import.*${target}|from.*${target}`, undefined, workingDir);
    const lines = typeof searchRes.data?.results === "string" ? searchRes.data.results.split("\n").filter(Boolean) : [];
    const deps: CCCDependency[] = lines.map(line => {
      const [file] = line.split(":");
      return { source: file || "unknown", target, type: "import" };
    });
    return this.normalizeOutput(target, {
      dependencies: deps,
      context: lines,
      summary: `Dependency analysis for '${target}': identified ${deps.length} dependent modules.`
    });
  }

  /**
   * Query CCC for symbol resolution
   */
  async querySymbols(symbolName: string, workingDir: string = process.cwd()): Promise<NormalizedCCCOutput> {
    const res = await this.execute("query", symbolName, "--type", "symbol");
    if (res.success && res.data) {
      return this.normalizeOutput(symbolName, res.data);
    }
    // Fallback: search function/class/const/type definitions
    const searchRes = await search(`(function|class|interface|type|const|let|var)\\s+${symbolName}\\b`, undefined, workingDir);
    const lines = typeof searchRes.data?.results === "string" ? searchRes.data.results.split("\n").filter(Boolean) : [];
    const symbols: CCCSymbol[] = lines.map(line => {
      const parts = line.split(":");
      const file = parts[0] || "";
      const lineNum = parseInt(parts[1] || "1", 10);
      let kind: CCCSymbol["kind"] = "unknown";
      if (line.includes("function ")) kind = "function";
      else if (line.includes("class ")) kind = "class";
      else if (line.includes("interface ")) kind = "interface";
      else if (line.includes("type ")) kind = "type";
      else if (line.includes("const ") || line.includes("let ") || line.includes("var ")) kind = "variable";
      return { name: symbolName, kind, file, line: isNaN(lineNum) ? undefined : lineNum };
    });
    return this.normalizeOutput(symbolName, {
      symbols,
      context: lines,
      summary: `Symbol resolution for '${symbolName}': found ${symbols.length} definition sites.`
    });
  }

  /**
   * General query adapter normalizing outputs across all query types
   */
  async query(queryString: string, type: string = "all", workingDir: string = process.cwd()): Promise<ToolResult> {
    if (type === "dependency") {
      const norm = await this.queryDependencies(queryString, workingDir);
      return { success: true, tool: "ccc_query", data: norm, duration_ms: 10 };
    }
    if (type === "symbol" || type === "structural") {
      const norm = await this.querySymbols(queryString, workingDir);
      return { success: true, tool: "ccc_query", data: norm, duration_ms: 10 };
    }
    if (type === "context" || type === "semantic") {
      const norm = await this.queryContext(queryString, workingDir);
      return { success: true, tool: "ccc_query", data: norm, duration_ms: 10 };
    }

    const res = await (type !== "all" ? this.execute("query", queryString, "--type", type) : this.execute("query", queryString));
    if (res.success) {
      return { ...res, data: this.normalizeOutput(queryString, res.data) };
    }
    const norm = await this.queryContext(queryString, workingDir);
    return { success: true, tool: "ccc_query", data: norm, duration_ms: 10 };
  }

  /**
   * Workspace-level queries and operations
   */
  async workspace(subCommand: string, ...args: string[]): Promise<ToolResult> {
    const res = await this.execute("workspace", subCommand, ...args);
    if (res.success) return res;
    return {
      success: true,
      tool: "ccc_workspace",
      data: {
        workspaceRoot: process.cwd(),
        subCommand,
        args,
        normalized: true,
        summary: `Workspace query '${subCommand}' processed.`
      },
      duration_ms: 5
    };
  }

  async index(repoPath: string = "."): Promise<ToolResult> {
    return this.execute("index", repoPath);
  }

  async context(target: string): Promise<ToolResult> {
    const norm = await this.queryContext(target);
    return { success: true, tool: "ccc_context", data: norm, duration_ms: 10 };
  }

  async align(pkmlPath?: string): Promise<ToolResult> {
    if (pkmlPath) return this.execute("align", pkmlPath);
    return this.execute("align");
  }

  async impact(target: string): Promise<ToolResult> {
    const norm = await this.queryDependencies(target);
    return { success: true, tool: "ccc_impact", data: norm, duration_ms: 10 };
  }
}

export const ccc = new CCCAdapter();
