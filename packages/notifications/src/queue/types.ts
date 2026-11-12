export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  priority?: number;
  scheduledAt?: Date;
  createdAt: Date;
}

export interface QueueAdapter {
  enqueue<T>(queue: string, job: Omit<QueueJob<T>, "id" | "createdAt">): Promise<string>;
  dequeue<T>(queue: string): Promise<QueueJob<T> | null>;
  acknowledge(jobId: string): Promise<void>;
  fail(jobId: string, error: string): Promise<void>;
  getLength(queue: string): Promise<number>;
}
