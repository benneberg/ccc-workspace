import db from "./db.ts";
import { randomUUID } from "crypto";

export interface Task {
  id: string;
  title: string;
  goal: string;
  status: "pending" | "active" | "done" | "error";
  repository: string;
  metadata: string;
}

export const taskService = {
  createTask: (title: string, goal: string, repository: string) => {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO tasks (id, title, goal, status, repository, metadata)
      VALUES (?, ?, ?, 'pending', ?, ?)
    `);
    stmt.run(id, title, goal, repository, JSON.stringify({ steps: [] }));
    return id;
  },

  getTasks: (repository?: string) => {
    if (repository) {
      return db.prepare("SELECT * FROM tasks WHERE repository = ? ORDER BY created_at DESC").all(repository);
    }
    return db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
  },

  updateTaskStatus: (id: string, status: string) => {
    db.prepare("UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
  },

  updateTaskMetadata: (id: string, metadata: any) => {
    db.prepare("UPDATE tasks SET metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(JSON.stringify(metadata), id);
  }
};
