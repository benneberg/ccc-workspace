import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import cookieParser from "cookie-parser";
import multer from "multer";
import * as tools from "./src/server/tools/index.ts";
import { orchestrator } from "./src/server/tools/toolOrchestrator.ts";
import { taskService } from "./src/server/taskService.ts";
import { ccc } from "./src/server/ccc.ts";
import db from "./src/server/db.ts";
import * as auth from "./src/server/auth.ts";
import { repoService } from "./src/server/repoService.ts";
import { chatStream } from "./src/server/ai.ts";
import { memoryService } from "./src/server/memory.ts";
import { approvalManager } from "./src/server/approvalManager.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  await repoService.init();
  await memoryService.init();

  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    secret: "ccc-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: true,
      sameSite: "none",
      httpOnly: true,
    }
  }));

  // Create HTTP server for both Express and WebSockets
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  console.log("Initializing WebSocket server...");
  wss.on("connection", (ws: WebSocket, req) => {
    const clientOrigin = req.headers.origin || "direct/local";
    console.log(`[WebSocket] Client connected from origin: ${clientOrigin}`);
    approvalManager.registerSocket(ws);
    ws.on("message", async (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.type === "chat") {
          const { message, history, currentRepo } = payload;
          ws.send(JSON.stringify({ type: "stream_start" }));
          
          try {
            await chatStream(
              history,
              message,
              currentRepo,
              (token) => ws.send(JSON.stringify({ type: "stream_token", token })),
              (name, args) => ws.send(JSON.stringify({ type: "tool_call", name, args })),
              (name, result) => ws.send(JSON.stringify({ type: "tool_result", name, result }))
            );
          } catch (e: any) {
            ws.send(JSON.stringify({ type: "error", message: e.message }));
          }
          ws.send(JSON.stringify({ type: "stream_end" }));
        } else if (payload.type === "approve_write") {
          const { id, approved } = payload;
          approvalManager.handleApprovalResponse(id, approved);
          ws.send(JSON.stringify({ type: "approval_processed", id, approved }));
        } else if (payload.type === "tool_exec") {
          const { id, name, args, currentRepo } = payload;
          const workingDir = currentRepo ? path.resolve(process.cwd(), "mounted_repos", currentRepo) : process.cwd();
          
          let result;
          try {
            switch (name) {
              case "readFile":
              case "writeFile":
              case "applyPatch":
              case "runCommand":
              case "search":
              case "listFiles":
              case "findFiles":
              case "gitStatus":
              case "gitDiff":
              case "gitCommit":
              case "saveMemory":
              case "searchMemory":
                result = await orchestrator.execute(name, args, workingDir);
                break;
              case "createTask": 
                const taskId = taskService.createTask(args.title, args.goal, args.repository);
                result = { success: true, taskId };
                break;
              case "updateTaskStatus":
                taskService.updateTaskStatus(args.taskId, args.status);
                result = { success: true };
                break;
              case "ccc_query": result = await ccc.query(args.queryString, args.type); break;
              case "ccc_context": result = await ccc.context(args.target); break;
              case "ccc_align": result = await ccc.align(args.pkmlPath); break;
              case "ccc_workspace": result = await ccc.workspace(args.subCommand, ...(args.args || [])); break;
              case "ccc_index": result = await ccc.index(args.repoPath || workingDir); break;
              default: result = { error: "Unknown tool" };
            }
          } catch (e: any) {
            result = { error: e.message };
          }
          ws.send(JSON.stringify({ type: "tool_response", id, result }));
        }
      } catch (error) {
        console.error("WS Error:", error);
      }
    });
    ws.send(JSON.stringify({ type: "connected", content: "CCC Runtime Ready" }));
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth routes
  app.get("/api/auth/url", auth.getAuthUrl);
  app.get("/auth/callback", auth.handleCallback);
  app.get("/api/auth/user", auth.getGithubUser);

  // Repo routes
  app.get("/api/repos", async (req, res) => {
    const repos = await repoService.listRepos();
    res.json(repos);
  });

  app.get("/api/tasks", (req, res) => {
    const { repository } = req.query;
    const tasks = taskService.getTasks(repository as string);
    res.json(tasks);
  });

  app.get("/api/memory", async (req, res) => {
    const { repository, query } = req.query;
    if (!repository) return res.status(400).send("Repository required");
    const results = await memoryService.searchMemory(repository as string, (query as string) || "");
    res.json(results);
  });

  app.post("/api/repos/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");
    try {
      const result = await repoService.handleZipUpload(req.file.buffer, req.file.originalname);
      res.json(result);
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  app.delete("/api/repos/:name", async (req, res) => {
    try {
      await repoService.deleteRepo(req.params.name);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  app.post("/api/repos/clone", async (req, res) => {
    const { url } = req.body;
    const token = (req.session as any).githubToken;
    if (!token) return res.status(401).send("Connect GitHub first");
    try {
      const result = await repoService.cloneFromGithub(url, token);
      res.json(result);
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    console.log("Development mode: starting Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
