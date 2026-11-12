import postgres from "postgres";
import { WorkflowRepository } from "./repository";
import { WorkflowEngine } from "./engine";
import { TriggerRegistry } from "./trigger-registry";
import { BackgroundWorker } from "./worker";

export function createWorkflowService(connectionString: string) {
  const sql = postgres(connectionString, { max: 10 });
  const repo = new WorkflowRepository(sql);
  const engine = new WorkflowEngine(repo);
  const triggerRegistry = new TriggerRegistry(repo);
  const worker = new BackgroundWorker(repo);

  return {
    repo,
    engine,
    triggerRegistry,
    worker,
    sql,
  };
}

export { WorkflowRepository } from "./repository";
export { WorkflowEngine } from "./engine";
export { TriggerRegistry } from "./trigger-registry";
export { BackgroundWorker } from "./worker";

export async function dispatchTrigger(
  connectionString: string,
  triggerType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const svc = createWorkflowService(connectionString);
    await svc.triggerRegistry.dispatch({ triggerType, entityId, payload });
    await svc.sql.end({ timeout: 5 });
  } catch (err) {
    console.error(`[Workflow] Failed to dispatch ${triggerType}:`, err);
  }
}

export { getActionHandler, getRegisteredActions } from "./actions";
export type {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowLog,
  ActionDefinition,
  ActionResult,
  ActionHandler,
  TriggerPayload,
  ListResponse,
  WorkflowFilters,
  WorkflowRunFilters,
} from "./types";
