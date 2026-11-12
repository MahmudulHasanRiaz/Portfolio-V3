import { WorkflowRepository } from "./repository";
import { getActionHandler } from "./actions";
import type { WorkflowRun } from "./types";

export class WorkflowEngine {
  constructor(private repo: WorkflowRepository) {}

  async executeRun(run: WorkflowRun): Promise<void> {
    const workflow = await this.repo.getWorkflow(run.workflowId);
    if (!workflow) {
      await this.repo.updateRunStatus(run.id, "failed", { completedAt: new Date().toISOString() });
      return;
    }

    await this.repo.updateRunStatus(run.id, "running", { startedAt: new Date().toISOString() });

    const completedLogs = await this.repo.getCompletedLogsByRun(run.id);
    const completedOrders = new Set(completedLogs.map((l) => l.actionOrder));

    const actionsRaw: { type: string; config: Record<string, unknown>; order: number }[] =
      typeof workflow.actions === "string" ? JSON.parse(workflow.actions) : workflow.actions;
    const actions = [...actionsRaw].sort((a, b) => a.order - b.order);
    let allSucceeded = true;
    let failedActionOrder = -1;

    for (const action of actions) {
      if (completedOrders.has(action.order)) continue;

      const handler = getActionHandler(action.type);
      if (!handler) {
        failedActionOrder = action.order;
        allSucceeded = false;
        await this.repo.createLog({
          runId: run.id,
          actionType: action.type,
          actionOrder: action.order,
          status: "failed",
          input: action.config,
          error: `Unknown action type: ${action.type}`,
        });
        break;
      }

      const log = await this.repo.createLog({
        runId: run.id,
        actionType: action.type,
        actionOrder: action.order,
        status: "running",
        input: action.config,
        startedAt: new Date().toISOString(),
      });

      // Handlers resolve ids from the payload, so merge the run's own
      // trigger identity in (triggerPayload alone has neither entityId
      // nor triggerType — they live on the run row).
      const parsedPayload = typeof run.triggerPayload === "string"
        ? JSON.parse(run.triggerPayload)
        : (run.triggerPayload || {});
      const payload: Record<string, unknown> = {
        ...parsedPayload,
        entityId: run.triggerEntityId ?? parsedPayload.entityId,
        triggerType: run.triggerType,
      };
      const result = await handler(action.config, payload, { sql: this.repo.getSql() });

      if (result.success) {
        await this.repo.updateLog(log.id, {
          status: "completed",
          output: result.data || {},
          completedAt: new Date().toISOString(),
        });
      } else {
        failedActionOrder = action.order;
        allSucceeded = false;
        await this.repo.updateLog(log.id, {
          status: "failed",
          error: result.error,
          completedAt: new Date().toISOString(),
        });
        break;
      }
    }

    const now = new Date().toISOString();

    if (allSucceeded) {
      await this.repo.updateRunStatus(run.id, "completed", { completedAt: now });
    } else {
      const newRetryCount = (run.retryCount || 0) + 1;
      if (newRetryCount < (workflow.maxRetries || 3)) {
        const backoffMinutes = Math.pow(newRetryCount, 2);
        const nextRetry = new Date();
        nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
        await this.repo.updateRunStatus(run.id, "pending", {
          retryCount: newRetryCount,
          nextRetryAt: nextRetry.toISOString(),
        });
      } else {
        const hadCompletedActions = completedOrders.size > 0 || (failedActionOrder > 0);
        await this.repo.updateRunStatus(run.id, hadCompletedActions ? "partially_failed" : "failed", {
          completedAt: now,
          retryCount: newRetryCount,
        });
      }
    }
  }
}
