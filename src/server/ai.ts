import { GoogleGenAI, Type } from "@google/genai";
import * as tools from "./tools/index.ts";
import { taskService } from "./taskService.ts";
import { ccc } from "./ccc.ts";
import path from "path";
import fs from "fs/promises";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY as string,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const toolDefinitions = [
  {
    functionDeclarations: [
      {
        name: "readFile",
        description: "Read the contents of a file in the repository.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING, description: "Path to the file relative to repo root." }
          },
          required: ["filePath"]
        }
      },
      {
        name: "writeFile",
        description: "Write content to a file in the repository.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING, description: "Path to the file." },
            content: { type: Type.STRING, description: "Full content to write." }
          },
          required: ["filePath", "content"]
        }
      },
      {
        name: "search",
        description: "Search for a pattern in the repository using grep.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            pattern: { type: Type.STRING, description: "Regex pattern to search for." },
            glob: { type: Type.STRING, description: "Optional glob pattern to restrict files." }
          },
          required: ["pattern"]
        }
      },
      {
        name: "listFiles",
        description: "List files in a directory.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            dirPath: { type: Type.STRING, description: "Directory path relative to root." }
          }
        }
      },
      {
        name: "findFiles",
        description: "Recursively find files matching a pattern.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            pattern: { type: Type.STRING, description: "Pattern to find (e.g. *.ts)." }
          }
        }
      },
      {
        name: "createTask",
        description: "Create a new engineering task to track progress.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Short title of the task." },
            goal: { type: Type.STRING, description: "Detailed goal of the task." },
            repository: { type: Type.STRING, description: "Repository name." }
          },
          required: ["title", "goal", "repository"]
        }
      },
      {
        name: "updateTaskStatus",
        description: "Update the status of a task.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            taskId: { type: Type.STRING, description: "The ID of the task." },
            status: { type: Type.STRING, enum: ["pending", "active", "done", "error"], description: "New status." }
          },
          required: ["taskId", "status"]
        }
      },
      {
        name: "ccc_query",
        description: "Perform a CCC repository query.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            queryString: { type: Type.STRING, description: "The query string." },
            type: { type: Type.STRING, enum: ["semantic", "structural", "dependency"], description: "Query type." }
          },
          required: ["queryString", "type"]
        }
      },
      {
        name: "saveMemory",
        description: "Save a persistent memory entry for the repository.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, description: "The content to remember." },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tags for filtering." }
          },
          required: ["content"]
        }
      },
      {
        name: "searchMemory",
        description: "Search persistent memory for relevant information.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: "Search query." }
          },
          required: ["query"]
        }
      },
      {
        name: "runCommand",
        description: "Execute a shell command in the repository workspace.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: "The command to run." }
          },
          required: ["command"]
        }
      },
      {
        name: "gitStatus",
        description: "Get the current git status of the repository.",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      },
      {
        name: "gitDiff",
        description: "Get the git diff of the repository.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            cached: { type: Type.BOOLEAN, description: "Whether to show staged changes." }
          }
        }
      },
      {
        name: "gitCommit",
        description: "Stage all changes and create a git commit.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "Semantic commit message." }
          },
          required: ["message"]
        }
      }
    ]
  }
];

export async function chatStream(
  history: any[],
  message: string,
  currentRepo: string | null,
  onToken: (token: string) => void,
  onToolCall: (name: string, args: any) => void,
  onToolResult: (name: string, result: any) => void
) {
  const modelName = "gemini-3.5-flash";
  const workingDir = currentRepo ? path.resolve(process.cwd(), "mounted_repos", currentRepo) : process.cwd();

  const contents = [
    ...history.map(m => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: m.content }]
    })),
    { role: "user" as const, parts: [{ text: message }] }
  ];

  const systemInstruction = `You are CCC AI Workspace (personality: MiMo), a world-class software engineer.
You have access to the user's repository and system tools.

CORE WORKFLOW:
1. EXPLORE: Use listFiles, readFile, search, and ccc_query to understand the repository.
2. PLAN: Use createTask to define a clear engineering goal. Use persistent memory (saveMemory) for key architectural facts.
3. EXECUTE: Use writeFile and runCommand to implement and verify changes.
4. VALIDATE: Use runCommand to run tests/linting. Use updateTaskStatus to track progress.

GUIDELINES:
- Currently active repository: ${currentRepo || "None"}.
- Be concise but technically precise.
- When writing files, preserve formatting unless refactoring.
- Always check gitStatus and gitDiff to confirm your own changes.
- Use persistent memory to avoid asking the same questions about architecture twice.`;

  async function processStream(streamContents: any[]) {
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: streamContents,
      config: { 
        tools: toolDefinitions,
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: "LOW" as any // Try to minimize reasoning for speed/simplicity
        }
      }
    });

    let modelTurnParts: any[] = [];

    for await (const chunk of stream) {
      if (chunk.candidates?.[0]?.content?.parts) {
        modelTurnParts.push(...chunk.candidates[0].content.parts);
      }
      
      if (chunk.text) {
        onToken(chunk.text);
      }

      // We handle thoughts too if needed, but for now we just want to ensure we collect all parts for the next turn
    }

    // Check if there are function calls in the collected parts
    const functionCalls = modelTurnParts.filter(p => p.functionCall).map(p => p.functionCall);

    if (functionCalls.length > 0) {
      // Model wants to use tools
      const nextContents = [
        ...streamContents,
        { role: "model" as const, parts: modelTurnParts }
      ];

      const toolResponses: any[] = [];
      for (const call of functionCalls) {
        onToolCall(call.name, call.args);
        
        let result;
        try {
          switch (call.name) {
            case "readFile": result = await tools.readFile(call.args.filePath, workingDir); break;
            case "writeFile": result = await tools.writeFile(call.args.filePath, call.args.content, workingDir); break;
            case "search": result = await tools.search(call.args.pattern, call.args.glob, workingDir); break;
            case "listFiles": result = await tools.listFiles(call.args.dirPath, workingDir); break;
            case "findFiles": result = await tools.findFiles(call.args.pattern, workingDir); break;
            case "createTask": {
              const { title, goal, repository } = call.args;
              const taskId = taskService.createTask(title, goal, repository);
              result = { success: true, taskId, title, goal };
              break;
            }
            case "updateTaskStatus": {
              const { taskId, status } = call.args;
              taskService.updateTaskStatus(taskId, status);
              result = { success: true, taskId, status };
              break;
            }
            case "ccc_query": {
              const { queryString, type } = call.args;
              result = await ccc.query(queryString, type);
              break;
            }
            case "saveMemory": {
              const { memoryService } = await import("./memory.ts");
              result = await memoryService.saveMemory(currentRepo || "global", call.args);
              break;
            }
            case "searchMemory": {
              const { memoryService } = await import("./memory.ts");
              result = await memoryService.searchMemory(currentRepo || "global", call.args.query);
              break;
            }
            case "runCommand": {
              result = await tools.runCommand(call.args.command, workingDir);
              break;
            }
            case "gitStatus": {
              result = await tools.runCommand("git status", workingDir);
              break;
            }
            case "gitDiff": {
              const cmd = call.args.cached ? "git diff --cached" : "git diff";
              result = await tools.runCommand(cmd, workingDir);
              break;
            }
            case "gitCommit": {
              const { orchestrator } = await import("./tools/toolOrchestrator.ts");
              result = await orchestrator.execute("gitCommit", call.args, workingDir);
              break;
            }
            default: result = { error: "Unknown tool" };
          }
        } catch (e: any) {
          result = { error: e.message };
        }

        onToolResult(call.name, result);
        toolResponses.push({ functionResponse: { name: call.name, response: result } });
      }

      nextContents.push({ role: "user" as const, parts: toolResponses });
      await processStream(nextContents);
    }
  }

  await processStream(contents);
}
