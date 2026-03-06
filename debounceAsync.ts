export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let callId = 0;

  return function(...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    clearTimeout(timeoutId);
    const currentId = ++callId;

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        if (currentId !== callId) {
          const stale = new Error("Call is stale");
          return reject(stale);
        }
        try {
          const result = await fn(...args);
          if (currentId !== callId) {
            const stale = new Error("Call is stale");
            return reject(stale);
          }
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}
