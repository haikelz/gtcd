process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

await import("../build/index.js");
