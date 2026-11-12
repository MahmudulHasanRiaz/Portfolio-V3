import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = postgres(url, { max: 1 });

  console.log("Creating tables...");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS workflows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      trigger_type VARCHAR(100) NOT NULL,
      trigger_config JSONB DEFAULT '{}',
      actions JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT true,
      max_retries INTEGER NOT NULL DEFAULT 3,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log(" - workflows table OK");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL,
      workflow_version INTEGER NOT NULL,
      trigger_type VARCHAR(100) NOT NULL,
      trigger_entity_id UUID,
      trigger_payload JSONB DEFAULT '{}',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log(" - workflow_runs table OK");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS workflow_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id UUID NOT NULL,
      action_type VARCHAR(100) NOT NULL,
      action_order INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      input JSONB DEFAULT '{}',
      output JSONB DEFAULT '{}',
      error TEXT,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log(" - workflow_logs table OK");

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_trigger_type ON workflow_runs(trigger_type);
    CREATE INDEX IF NOT EXISTS idx_workflow_logs_run_id ON workflow_logs(run_id);
  `);

  console.log(" - indexes OK");

  await sql.end();
  console.log("Done!");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
