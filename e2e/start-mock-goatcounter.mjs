// Starts e2e/mock-goatcounter.mjs only on a free port. A mock left running by
// an earlier suite would otherwise answer this run with stale fixture state.
import { connect, createServer } from "node:net";

const PORT = Number(process.env.MOCK_PORT ?? 5187);

await new Promise((resolve) => {
  const probe = createServer();
  probe.once("error", () => {
    console.error(
      `Port ${PORT} is already in use, probably by a stale ` +
        "e2e/mock-goatcounter.mjs from an earlier run. Free it with " +
        `\`lsof -ti tcp:${PORT} | xargs kill\` or set TEST_MOCK_PORT to a free port.`
    );
    process.exit(1);
  });
  probe.listen(PORT, "127.0.0.1", () => probe.close(resolve));
});

await import("./mock-goatcounter.mjs");

function accepting() {
  return new Promise((resolve) => {
    const socket = connect(PORT, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

while (!(await accepting())) {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

// playwright.config.ts waits for this line instead of probing the port.
console.log(`mock-goatcounter listening on ${PORT}`);
