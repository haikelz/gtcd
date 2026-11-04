// Container entry point. As PID 1, Node gets no default SIGTERM handling, so a
// handler must exist before the server loads. Once it has loaded, adapter-node
// drains in-flight requests and emits "sveltekit:shutdown"; hooks.server.ts
// then stops the report scheduler, waits for a run in progress, closes Redis
// and exits 0. The timer below is only the backstop for a stuck shutdown and
// must stay under terminationGracePeriodSeconds (30s in k8s/gtcd/deployment.yaml).
const HARD_TIMEOUT_MS = 25_000;

// adapter-node force-closes connections still open after this many seconds,
// leaving the rest of the hard timeout for the report run and Redis.
process.env.SHUTDOWN_TIMEOUT ??= "15";

let serverLoaded = false;

function onSignal() {
  if (!serverLoaded) process.exit(0);

  setTimeout(() => {
    console.error("shutdown: still running after 25s; exiting");
    process.exit(1);
  }, HARD_TIMEOUT_MS).unref();
}

process.on("SIGTERM", onSignal);
process.on("SIGINT", onSignal);

await import("../build/index.js");
serverLoaded = true;
