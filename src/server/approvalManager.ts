import { WebSocket } from "ws";
import path from "path";
import fs from "fs/promises";

export interface PendingApproval {
  id: string;
  filePath: string;
  content: string;
  reason: string;
  resolve: (approved: boolean) => void;
}

class ApprovalManager {
  private pending = new Map<string, PendingApproval>();
  private activeSockets = new Set<WebSocket>();

  registerSocket(ws: WebSocket) {
    this.activeSockets.add(ws);
    ws.on("close", () => this.activeSockets.delete(ws));
  }

  /**
   * Check if a file write requires approval.
   * If the file exists (overwritten) or the content size is substantial (> 1000 characters),
   * then approval is required.
   */
  async checkWriteApprovalNeeded(filePath: string, content: string, workingDir: string): Promise<{ needed: boolean; reason: string }> {
    try {
      const fullPath = path.resolve(workingDir, filePath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      if (exists) {
        const oldContent = await fs.readFile(fullPath, "utf-8");
        if (oldContent !== content) {
          return { needed: true, reason: `File '${filePath}' already exists and will be overwritten.` };
        }
      } else {
        if (content.length > 1000) {
          return { needed: true, reason: `Substantial new file '${filePath}' of size ${content.length} characters is being created.` };
        }
      }
      return { needed: false, reason: "" };
    } catch {
      return { needed: false, reason: "" };
    }
  }

  /**
   * Request approval from the frontend
   */
  async requestApproval(filePath: string, content: string, reason: string): Promise<boolean> {
    const id = Math.random().toString(36).substring(7);
    return new Promise<boolean>((resolve) => {
      this.pending.set(id, { id, filePath, content, reason, resolve });
      
      const payload = JSON.stringify({
        type: "pending_approval",
        id,
        filePath,
        content,
        reason
      });

      console.log(`[ApprovalManager] Requesting approval for ID ${id}, path: ${filePath}`);
      for (const ws of this.activeSockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    });
  }

  handleApprovalResponse(id: string, approved: boolean) {
    console.log(`[ApprovalManager] Received approval response for ID ${id}: approved = ${approved}`);
    const p = this.pending.get(id);
    if (p) {
      p.resolve(approved);
      this.pending.delete(id);
      return true;
    }
    return false;
  }
}

export const approvalManager = new ApprovalManager();
