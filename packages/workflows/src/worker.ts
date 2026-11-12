import { WorkflowRepository } from "./repository";
import { WorkflowEngine } from "./engine";

export class BackgroundWorker {
  private repo: WorkflowRepository;
  private engine: WorkflowEngine;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  constructor(repo: WorkflowRepository) {
    this.repo = repo;
    this.engine = new WorkflowEngine(repo);
  }

  async processNext(): Promise<{ processed: boolean; runId?: string; status?: string }> {
    if (this.isProcessing) return { processed: false };
    this.isProcessing = true;

    try {
      const pendingRuns = await this.repo.getPendingRuns();
      if (pendingRuns.length === 0) {
        return { processed: false };
      }

      const run = pendingRuns[0]!;
      await this.engine.executeRun(run);

      const updatedRun = await this.repo.getRun(run.id);
      return { processed: true, runId: run.id, status: updatedRun?.status };
    } finally {
      this.isProcessing = false;
    }
  }

  start(intervalMs = 5000): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.processNext(), intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
