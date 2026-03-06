function debounceAsync<T>(fn: (...args: unknown[]) => Promise<T>, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallId = 0;

  return function (...args: unknown[]): Promise<T> {
    const callId = ++lastCallId;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        timeoutId = null;
        try {
          const result = await fn(...args);
          const stale = callId !== lastCallId;
          if (stale) {
            reject(new Error("Stale"));
          } else {
            resolve(result);
          }
        } catch (err) {
          const stale = callId !== lastCallId;
          if (stale) {
            reject(new Error("Stale"));
          } else {
            reject(err);
          }
        }
      }, delay);
    });
  };
}
