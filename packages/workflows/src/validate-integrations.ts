import postgres from "postgres";
import { WorkflowRepository } from "./repository";
import { TriggerRegistry } from "./trigger-registry";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

interface ValidationResult {
  triggerType: string;
  entityType: string;
  entityId: string;
  runCreated: boolean;
  workflowMatched: boolean;
  runStatus: string | null;
}

async function main() {
  const results: ValidationResult[] = [];
  const sql = postgres(url!, { max: 1 });
  const repo = new WorkflowRepository(sql);
  const registry = new TriggerRegistry(repo);

  console.log("=".repeat(72));
  console.log("PHASE 16.1 INTEGRATION VALIDATION");
  console.log("=".repeat(72));

  // Clean old test data
  await sql.unsafe(`DELETE FROM workflow_logs WHERE run_id IN (SELECT id FROM workflow_runs WHERE workflow_id IN (SELECT id FROM workflows WHERE created_by = '00000000-0000-0000-0000-000000000000'))`);
  await sql.unsafe(`DELETE FROM workflow_runs WHERE workflow_id IN (SELECT id FROM workflows WHERE created_by = '00000000-0000-0000-0000-000000000000')`);
  await sql.unsafe(`DELETE FROM workflows WHERE created_by = '00000000-0000-0000-0000-000000000000'`);

  // Create a workflow for each trigger type
  const triggers = ["lead_created","lead_status_changed","content_published","venture_published","release_published","proposal_accepted"];
  for (const tt of triggers) {
    await repo.createWorkflow({
      name: `Val: ${tt}`, triggerType: tt, triggerConfig: {},
      actions: [{ type: "create_task", config: { title: `Auto: ${tt}`, description: `Triggered by ${tt}` }, order: 1 }],
      isActive: true, maxRetries: 3, createdBy: "00000000-0000-0000-0000-000000000000",
    });
    console.log(`  [Setup] Workflow created for "${tt}"`);
  }

  // 1. CRM: lead_created
  console.log("\n--- 1. CRM: lead_created ---");
  const leadId = "10000000-0000-0000-0000-000000000001";
  {
    const tr = await registry.dispatch({ triggerType: "lead_created", entityId: leadId, payload: { id: leadId, name: "Val Lead", email: "val@test.com", source: "validation", status: "new" } });
    const run = tr.runIds[0] ? await repo.getRun(tr.runIds[0]) : null;
    console.log(`  Dispatched: ${tr.triggered} workflow(s) matched, run=${tr.runIds.length > 0}, status=${run?.status}`);
    results.push({ triggerType: "lead_created", entityType: "lead", entityId: leadId, runCreated: tr.runIds.length > 0, workflowMatched: tr.triggered > 0, runStatus: run?.status ?? null });
  }

  // 2. CRM: lead_status_changed
  console.log("\n--- 2. CRM: lead_status_changed ---");
  {
    const tr = await registry.dispatch({ triggerType: "lead_status_changed", entityId: leadId, payload: { id: leadId, newStatus: "qualified", previousStatus: "new" } });
    const run = tr.runIds[0] ? await repo.getRun(tr.runIds[0]) : null;
    console.log(`  Dispatched: ${tr.triggered} workflow(s) matched, run=${tr.runIds.length > 0}, status=${run?.status}`);
    results.push({ triggerType: "lead_status_changed", entityType: "lead", entityId: leadId, runCreated: tr.runIds.length > 0, workflowMatched: tr.triggered > 0, runStatus: run?.status ?? null });
  }

  // 3. CMS: content_published
  console.log("\n--- 3. CMS: content_published ---");
  const contentId = "20000000-0000-0000-0000-000000000001";
  {
    const tr = await registry.dispatch({ triggerType: "content_published", entityId: contentId, payload: { id: contentId, title: "Val Post", slug: "val-post", type: "post", status: "published" } });
    const run = tr.runIds[0] ? await repo.getRun(tr.runIds[0]) : null;
    console.log(`  Dispatched: ${tr.triggered} workflow(s) matched, run=${tr.runIds.length > 0}, status=${run?.status}`);
    results.push({ triggerType: "content_published", entityType: "content", entityId: contentId, runCreated: tr.runIds.length > 0, workflowMatched: tr.triggered > 0, runStatus: run?.status ?? null });
  }

  // 4. Entrepreneur: venture_published
  console.log("\n--- 4. Entrepreneur: venture_published ---");
  const ventureId = "30000000-0000-0000-0000-000000000001";
  {
    const tr = await registry.dispatch({ triggerType: "venture_published", entityId: ventureId, payload: { id: ventureId, name: "Val Venture", slug: "val-venture", status: "active" } });
    const run = tr.runIds[0] ? await repo.getRun(tr.runIds[0]) : null;
    console.log(`  Dispatched: ${tr.triggered} workflow(s) matched, run=${tr.runIds.length > 0}, status=${run?.status}`);
    results.push({ triggerType: "venture_published", entityType: "venture", entityId: ventureId, runCreated: tr.runIds.length > 0, workflowMatched: tr.triggered > 0, runStatus: run?.status ?? null });
  }

  // 5. Artist: release_published
  console.log("\n--- 5. Artist: release_published ---");
  const releaseId = "40000000-0000-0000-0000-000000000001";
  {
    const tr = await registry.dispatch({ triggerType: "release_published", entityId: releaseId, payload: { id: releaseId, title: "Val Release", type: "album", format: "digital", status: "published" } });
    const run = tr.runIds[0] ? await repo.getRun(tr.runIds[0]) : null;
    console.log(`  Dispatched: ${tr.triggered} workflow(s) matched, run=${tr.runIds.length > 0}, status=${run?.status}`);
    results.push({ triggerType: "release_published", entityType: "release", entityId: releaseId, runCreated: tr.runIds.length > 0, workflowMatched: tr.triggered > 0, runStatus: run?.status ?? null });
  }

  // 6. Portal: proposal_accepted
  console.log("\n--- 6. Portal: proposal_accepted ---");
  const proposalId = "50000000-0000-0000-0000-000000000001";
  {
    const tr = await registry.dispatch({ triggerType: "proposal_accepted", entityId: proposalId, payload: { id: proposalId, title: "Val Proposal", projectId: "50000000-0000-0000-0000-000000000002", status: "accepted" } });
    const run = tr.runIds[0] ? await repo.getRun(tr.runIds[0]) : null;
    console.log(`  Dispatched: ${tr.triggered} workflow(s) matched, run=${tr.runIds.length > 0}, status=${run?.status}`);
    results.push({ triggerType: "proposal_accepted", entityType: "proposal", entityId: proposalId, runCreated: tr.runIds.length > 0, workflowMatched: tr.triggered > 0, runStatus: run?.status ?? null });
  }

  // Summary
  console.log("\n" + "=".repeat(72));
  console.log("VALIDATION SUMMARY");
  console.log("=".repeat(72));
  console.log(`\n${"TRIGGER".padEnd(25)} ${"MATCHED".padEnd(10)} ${"RUN".padEnd(10)} ${"STATUS".padEnd(12)}`);
  console.log("-".repeat(60));

  let allPassed = true;
  for (const r of results) {
    const matched = r.workflowMatched ? "✓" : "✗";
    const created = r.runCreated ? "✓" : "✗";
    console.log(`${r.triggerType.padEnd(25)} ${matched.padEnd(10)} ${created.padEnd(10)} ${(r.runStatus ?? "N/A").padEnd(12)}`);
    if (!r.workflowMatched || !r.runCreated) allPassed = false;
  }
  console.log("-".repeat(60));

  if (allPassed) {
    console.log("\n✅ ALL 6 TRIGGER INTEGRATIONS VALIDATED");
    console.log("Every trigger type dispatched a workflow run correctly.");
  } else {
    console.log("\n❌ SOME INTEGRATIONS FAILED");
  }

  // Cleanup
  await sql.unsafe(`DELETE FROM workflow_logs WHERE run_id IN (SELECT id FROM workflow_runs WHERE workflow_id IN (SELECT id FROM workflows WHERE created_by = '00000000-0000-0000-0000-000000000000'))`);
  await sql.unsafe(`DELETE FROM workflow_runs WHERE workflow_id IN (SELECT id FROM workflows WHERE created_by = '00000000-0000-0000-0000-000000000000')`);
  await sql.unsafe(`DELETE FROM workflows WHERE created_by = '00000000-0000-0000-0000-000000000000'`);
  await sql.end();
  if (!allPassed) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
