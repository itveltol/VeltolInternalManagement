// TEMP perf instrumentation — remove after diagnosing slow contract save.
export async function timed<T>(label: string, p: Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await p;
  } finally {
    console.log(`[perf] ${label} ${Math.round(performance.now() - start)}ms`);
  }
}
