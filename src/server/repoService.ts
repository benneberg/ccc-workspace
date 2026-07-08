import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import axios from "axios";

const REPOS_DIR = path.resolve(process.cwd(), "mounted_repos");

export const repoService = {
  init: async () => {
    try {
      await fs.mkdir(REPOS_DIR, { recursive: true });
    } catch (e) {}
  },

  listRepos: async () => {
    try {
      const entries = await fs.readdir(REPOS_DIR, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => ({
          name: e.name,
          path: path.join("mounted_repos", e.name)
        }));
    } catch (e) {
      return [];
    }
  },

  handleZipUpload: async (buffer: Buffer, originalName: string) => {
    const repoName = originalName.replace(/\.zip$/i, "");
    const targetDir = path.join(REPOS_DIR, repoName);
    
    // Ensure clean start
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    const zip = new AdmZip(buffer);
    zip.extractAllTo(targetDir, true);

    // If there's only one directory inside, move its contents up
    const entries = await fs.readdir(targetDir);
    if (entries.length === 1) {
      const subPath = path.join(targetDir, entries[0]);
      const stat = await fs.stat(subPath);
      if (stat.isDirectory()) {
        const subEntries = await fs.readdir(subPath);
        for (const entry of subEntries) {
          await fs.rename(path.join(subPath, entry), path.join(targetDir, entry));
        }
        await fs.rmdir(subPath);
      }
    }

    return { name: repoName, path: path.join("mounted_repos", repoName) };
  },

  deleteRepo: async (repoName: string) => {
    const targetDir = path.join(REPOS_DIR, repoName);
    await fs.rm(targetDir, { recursive: true, force: true });
  },

  cloneFromGithub: async (repoUrl: string, token: string) => {
    // Since we don't have git directly easily available to use clone, 
    // we can use the GitHub API to download the default branch as a zip
    // repoUrl example: https://github.com/owner/repo
    const parts = repoUrl.replace("https://github.com/", "").split("/");
    if (parts.length < 2) throw new Error("Invalid GitHub URL");
    const [owner, repo] = parts;

    const downloadUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;
    
    const response = await axios.get(downloadUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
      },
      responseType: "arraybuffer",
    });

    return await repoService.handleZipUpload(Buffer.from(response.data), repo);
  }
};
