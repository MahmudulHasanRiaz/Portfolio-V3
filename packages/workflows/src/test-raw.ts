import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = postgres(url, { max: 1 });

  try {
    // Test: Can I do a basic select?
    const r1 = await sql`SELECT 1 as ok`;
    console.log("Basic query OK:", r1[0].ok);

    // Test: create a workflow directly
    const wf = await sql`
      INSERT INTO workflows (name, trigger_type, trigger_config, actions)
      VALUES ('Direct Test', 'lead_created', '{}'::jsonb, $1::jsonb)
      RETURNING *
    `;
    console.log("Created workflow:", wf[0].id);
    console.log("Workflow keys:", Object.keys(wf[0]));

    // Read it back
    const wf2 = await sql`SELECT * FROM workflows WHERE id = ${wf[0].id}`;
    console.log("Read back:", wf2[0].name, "trigger_type:", wf2[0].trigger_type);

    // Create a run
    const run = await sql`
      INSERT INTO workflow_runs (workflow_id, workflow_version, trigger_type, trigger_payload, status)
      VALUES (${wf[0].id}, 1, 'lead_created', '{}'::jsonb, 'pending')
      RETURNING *
    `;
    console.log("Created run:", run[0].id, run[0].status);
    console.log("Run keys:", Object.keys(run[0]));

    // Create a log
    const log = await sql`
      INSERT INTO workflow_logs (run_id, action_type, action_order, status, input, output, started_at)
      VALUES (${run[0].id}, 'test_action', 1, 'running', '{}'::jsonb, '{}'::jsonb, NOW())
      RETURNING *
    `;
    console.log("Created log:", log[0].id, log[0].status);
    console.log("Log keys:", Object.keys(log[0]));

    // Update run status
    await sql`
      UPDATE workflow_runs SET status = 'completed', completed_at = NOW() WHERE id = ${run[0].id}
    `;
    console.log("Run updated to completed");

    console.log("\nAll raw SQL tests OK");

  } catch (err) {
    console.error("FAILED:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
