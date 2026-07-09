/**
 * Bun-compatible Tool Orchestrator Test Harness & Demo
 * 
 * This script demonstrates the exact schema validation, logging, permission enforcement,
 * and unified response formats produced by the Tool Orchestrator.
 * 
 * To execute this in a Bun environment:
 *   bun run src/server/tools/bun_runner.ts
 */

import { orchestrator } from "./toolOrchestrator.ts";
import path from "path";

async function runDemo() {
  console.log("================================================================================");
  console.log("⚡ CCC Tool Orchestrator Runner");
  console.log("================================================================================");

  const sampleDir = process.cwd();
  const testFile = "data/demo_target.txt";

  console.log("\n1. Running Valid tool: 'writeFile' to create a test file...");
  const writeRes = await orchestrator.execute("writeFile", {
    filePath: testFile,
    content: "This is a foundational content line.\nAnother line here for patching.\nFinal stable line.\n"
  }, sampleDir);

  console.log(JSON.stringify(writeRes, null, 2));

  console.log("\n2. Running Invalid tool args (Zod Schema Validation Failure):");
  const badArgsRes = await orchestrator.execute("writeFile", {
    filePath: "", // invalid empty path
    content: "Oops"
  }, sampleDir);

  console.log(JSON.stringify(badArgsRes, null, 2));

  console.log("\n3. Running out-of-scope path (FileSystem Directory Permission Check):");
  const badPathRes = await orchestrator.execute("readFile", {
    filePath: "../../../etc/passwd" // attempting path traversal
  }, sampleDir);

  console.log(JSON.stringify(badPathRes, null, 2));

  console.log("\n4. Running 'readFile' on newly written file...");
  const readRes = await orchestrator.execute("readFile", {
    filePath: testFile
  }, sampleDir);

  console.log(JSON.stringify(readRes, null, 2));

  console.log("\n5. Running 'applyPatch' using Search / Replace Blocks...");
  const patchContent = `
<<<<<<< SEARCH
Another line here for patching.
=======
An updated patched line which replaces the old line successfully!
>>>>>>>
`;

  const patchRes = await orchestrator.execute("applyPatch", {
    filePath: testFile,
    patch: patchContent
  }, sampleDir);

  console.log(JSON.stringify(patchRes, null, 2));

  console.log("\n6. Running 'readFile' again to verify patch integration...");
  const finalRead = await orchestrator.execute("readFile", {
    filePath: testFile
  }, sampleDir);

  console.log(JSON.stringify(finalRead, null, 2));

  console.log("\n================================================================================");
  console.log("📋 ORCHESTRATOR EXECUTION LOGS");
  console.log("================================================================================");
  console.log(JSON.stringify(orchestrator.getLogs(), null, 2));
}

runDemo().catch((err) => {
  console.error("Harness run failed with error:", err);
});
