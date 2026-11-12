import { WorkflowRepository } from "./repository";
import type { TriggerPayload } from "./types";

export class TriggerRegistry {
  constructor(private repo: WorkflowRepository) {}

  async dispatch(trigger: TriggerPayload): Promise<{ triggered: number; runIds: string[] }> {
    const workflows = await this.repo.findActiveWorkflowsByTrigger(trigger.triggerType);
    const runIds: string[] = [];

    for (const workflow of workflows) {
      const run = await this.repo.createRun({
        workflowId: workflow.id,
        workflowVersion: workflow.version,
        triggerType: trigger.triggerType,
        triggerEntityId: trigger.entityId,
        triggerPayload: trigger.payload,
      });
      runIds.push(run.id);
    }

    return { triggered: workflows.length, runIds };
  }
}
