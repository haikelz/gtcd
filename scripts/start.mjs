// Container entry launcher for the adapter-node build.
//
// Node running as PID 1 does not die on unhandled SIGTERM/SIGINT (the kernel
// suppresses default-terminating signals for PID 1), so orchestrators wait out
// the full grace period and then SIGKILL. Registering handlers makes the
// kernel deliver the signals; the process then exits promptly. The app is a
// stateless SSR server, so an immediate exit is a safe shutdown contract.
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

await import("../build/index.js");
