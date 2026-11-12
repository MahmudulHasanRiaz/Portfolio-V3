import postgres from "postgres";
import { WorkflowRepository } from "./repository";
import { TriggerRegistry } from "./trigger-registry";
import { WorkflowEngine } from "./engine";
import { BackgroundWorker } from "./worker";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");
const sql = postgres(url, { max: 1 });
const repo = new WorkflowRepository(sql);
const registry = new TriggerRegistry(repo);
const engine = new WorkflowEngine(repo);
const worker = new BackgroundWorker(repo);

let passed = 0;
let failed = 0;
function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}`); }
}
function assertEq(label: string, actual: unknown, expected: unknown) {
  assert(`${label}: expected "${expected}", got "${actual}"`, actual === expected);
}

async function main() {
  try {
    console.log("=== Clean up old test data ===");
    await sql.unsafe(`DELETE FROM workflow_logs WHERE run_id IN (SELECT id FROM workflow_runs w WHERE w.workflow_id IN (SELECT id FROM workflows WHERE name LIKE 'Test:%'))`);
    await sql.unsafe(`DELETE FROM workflow_runs WHERE workflow_id IN (SELECT id FROM workflows WHERE name LIKE 'Test:%')`);
    await sql.unsafe(`DELETE FROM workflows WHERE name LIKE 'Test:%'`);
    console.log("  Cleaned up old test data\n");

    console.log("=== 1. Create Workflow ===");
    const wf = await repo.createWorkflow({
      name: "Test: Lead Created Automation",
      triggerType: "lead_created",
      triggerConfig: {},
      actions: [
        { type: "create_task", config: { title: "Follow up", description: "New lead", assigneeId: "10000000-0000-0000-0000-000000000002", dueInDays: 1 }, order: 1 },
        { type: "send_notification", config: { userId: "10000000-0000-0000-0000-000000000002", title: "New lead created", channel: "email", template: "new-lead" }, order: 2 },
        { type: "create_timeline_event", config: { entityType: "lead", entityId: "10000000-0000-0000-0000-000000000001", eventType: "note", content: "Lead created" }, order: 3 },
      ],
      isActive: true,
      maxRetries: 3,
      createdBy: "00000000-0000-0000-0000-000000000001",
    });
    console.log(`  Created workflow: ${wf.id} "${wf.name}" v${wf.version}\n`);

    console.log("=== 2. Dispatch Trigger ===");
    const triggerResult = await registry.dispatch({
      triggerType: "lead_created",
      entityId: "10000000-0000-0000-0000-000000000001",
      payload: { entityName: "Acme Corp", email: "contact@acme.com", source: "website", score: 85 },
    });
    console.log(`  Trigger dispatched: ${triggerResult.triggered} workflow(s) triggered, run: ${triggerResult.runIds[0]}\n`);
    assert("At least 1 run created", triggerResult.runIds.length >= 1);
    const runId = triggerResult.runIds[0];

    console.log("=== 3. Verify Pending Run ===");
    const runPending = await repo.getRun(runId);
    assertEq("Run status is pending", runPending?.status, "pending");
    assertEq("Run version matches", runPending?.workflowVersion, 1);
    console.log("  Trigger payload:", JSON.stringify(runPending?.triggerPayload).substring(0, 100), "\n");

    console.log("=== 4. Process Run ===");
    const result = await worker.processNext();
    assertEq("Worker processed a run", result.processed, true);
    assertEq("Run completed successfully", result.status, "completed");
    console.log("\n");

    console.log("=== 5. Verify Run Completion ===");
    const runCompleted = await repo.getRun(runId);
    assertEq("Run status is completed", runCompleted?.status, "completed");
    assert("Run completedAt is set", runCompleted?.completedAt !== null);
    console.log("\n");

    console.log("=== 6. Verify Action Logs ===");
    const logs = await repo.getLogsByRun(runId);
    assertEq(`Number of action logs`, logs.length, 3);
    for (let i = 0; i < logs.length; i++) {
      assertEq(`  Log ${i + 1}: action_type is ${["create_task", "send_notification", "create_timeline_event"][i]}`, logs[i].actionType, ["create_task", "send_notification", "create_timeline_event"][i]);
      assertEq(`  Log ${i + 1}: status is completed`, logs[i].status, "completed");
    }
    console.log("\n");

    console.log("=== 7. Test Unmatched Trigger ===");
    const unmatched = await registry.dispatch({
      triggerType: "venture_published",
      entityId: "venture-1",
      payload: { title: "Test Venture" },
    });
    assertEq("Unmatched trigger returns 0 matches", unmatched.triggered, 0);
    console.log("\n");

    console.log("=== 8. Test Action Failure + Retry ===");
    const wf2 = await repo.createWorkflow({
      name: "Test: Failure Workflow",
      triggerType: "test_error",
      triggerConfig: {},
      actions: [
        { type: "create_task", config: { title: "Step 1" }, order: 1 },
        { type: "trigger_webhook", config: { url: "", method: "GET" }, order: 2 },
        { type: "create_task", config: { title: "Step 3" }, order: 3 },
      ],
      isActive: true,
      maxRetries: 3,
    });
    const trigResult2 = await registry.dispatch({
      triggerType: "test_error",
      entityId: "20000000-0000-0000-0000-000000000001",
      payload: { test: true },
    });
    const failRunId = trigResult2.runIds[0];

    // Process once — should complete action 1, fail on 2
    await worker.processNext();
    const failRun1 = await repo.getRun(failRunId);
    console.log(`  After first process: status=${failRun1?.status}, retryCount=${failRun1?.retryCount}`);
    const logs1 = await repo.getLogsByRun(failRunId);
    for (const l of logs1) {
      console.log(`  Action ${l.actionOrder} (${l.actionType}): ${l.status}${l.error ? " error=" + l.error.substring(0, 80) : ""}`);
    }

    // Check retry scheduling
    assert(`Run is scheduled for retry (pending)`, failRun1?.status === "pending");
    assertEq("Retry count is 1", failRun1?.retryCount, 1);
    assert("nextRetryAt is set", failRun1?.nextRetryAt !== null);
    assert("Action 1 completed (skipped on retry)", logs1.filter(l => l.actionOrder === 1 && l.status === "completed").length >= 1);
    assert("Action 2 failed", logs1.filter(l => l.actionOrder === 2 && l.status === "failed").length >= 1);
    console.log("\n");

    console.log("=== 9. Verify List Endpoints ===");
    const allWf = await repo.listWorkflows({});
    assert("All workflows returned", allWf.total >= 2);
    const wfOnly = await repo.listWorkflows({ triggerType: "lead_created" });
    assertEq("Lead created workflows filtered", wfOnly.total, 1);
    const allRuns = await repo.listRuns({});
    assert("All runs returned", allRuns.total >= 2);
    console.log("\n");

    await sql.end();

    console.log(`========================================`);
    console.log(`✅ ${passed} passed, ${failed} failed`);
    console.log(`========================================`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("FATAL:", err instanceof Error ? err.message : String(err));
    console.error(err instanceof Error ? err.stack : "");
    await sql.end();
    process.exit(1);
  }
}

main();
