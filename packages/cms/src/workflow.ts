export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowError";
  }
}

export function validateTransition(
  currentStatus: string,
  targetStatus: string,
  allowedTransitions: Record<string, readonly string[]>,
): void {
  const allowed = allowedTransitions[currentStatus];
  if (!allowed) {
    throw new WorkflowError(`No transitions allowed from status "${currentStatus}"`);
  }
  if (!allowed.includes(targetStatus)) {
    throw new WorkflowError(
      `Cannot transition from "${currentStatus}" to "${targetStatus}". ` +
      `Allowed: ${allowed.join(", ")}`,
    );
  }
}

export const ACTION_STATUS_MAP: Record<string, string> = {
  publish: "published",
  unpublish: "draft",
  draft: "draft",
  archive: "archived",
  restore: "draft",
  submit: "review",
  approve: "published",
  schedule: "scheduled",
};

export function getTargetStatus(action: string): string {
  const status = ACTION_STATUS_MAP[action];
  if (!status) throw new WorkflowError(`Unknown workflow action: "${action}"`);
  return status;
}
