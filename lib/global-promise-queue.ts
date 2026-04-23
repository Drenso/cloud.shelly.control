export type WorkerFunction = () => void | Promise<void>;
export type WorkerRunContext = { cancel: boolean };
export type QueuedWorker = {
  promise: Promise<void>;
  context: WorkerRunContext;
};

let promiseRunning = false;
const queue: Record<
  string,
  Array<{
    worker: WorkerFunction;
    runContext: WorkerRunContext;
    resolve: (value: void) => void;
    reject: (reason: unknown) => void;
  }>
> = {};

export function queueWorker(scope: string, worker: WorkerFunction): QueuedWorker {
  queue[scope] ??= [];

  const runContext = { cancel: false };

  return {
    promise: new Promise<void>((resolve, reject) => {
      queue[scope].push({ worker, runContext, resolve, reject });
      void run(scope);
    }),
    context: runContext,
  };
}

async function run(scope: string): Promise<void> {
  if (promiseRunning) {
    return;
  }

  const item = queue[scope].shift();
  if (!item) {
    return;
  }

  const { worker, runContext, resolve, reject } = item;

  try {
    promiseRunning = true;
    if (runContext.cancel) {
      reject('cancelled');
    } else {
      await worker();
      resolve();
    }
  } catch (e) {
    reject(e);
  } finally {
    promiseRunning = false;
    void run(scope);
  }
}
