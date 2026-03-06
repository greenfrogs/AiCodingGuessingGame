type Task<T> = () => Promise<T>;

interface QueueItem<T> {
  task: Task<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export class AsyncQueue {
  private concurrency: number;
  private running: number;
  private queue: QueueItem<unknown>[];

  constructor(concurrency: number) {
    if (concurrency < 1) throw new Error("Concurrency must be at least 1");
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  add<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject } as QueueItem<unknown>);
      this.flush();
    });
  }

  private flush(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;
      this.run(item);
    }
  }

  private async run(item: QueueItem<unknown>): Promise<void> {
    try {
      const result = await item.task();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      this.running--;
      this.flush();
    }
  }

  get pending(): number {
    return this.queue.length;
  }

  get active(): number {
    return this.running;
  }
}
