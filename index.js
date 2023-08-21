const supabase = require("./utils/db");
const {httpServer, io} = require("./utils/socket");
const monitorQueue = require("./utils/queue");
const {setTimeout} = require("timers/promises");
const logger = require("./utils/logger");
const {io: socket} = require("socket.io-client");

const connection = socket("ws://localhost:8080");

function logOnError(err) {
  console.log(`Uncaught Exception: ${err.message}`);
  logger.info(`Uncaught Exception: ${err.message}`);
  process.exit(1);
}

process.on("beforeExit", logOnError);

process.on("uncaughtException", (err) => {
  console.log(`Uncaught Exception: ${err.message}`);
});

httpServer.listen(3000, async () => {
  // await Promise.all([monitorQueue, heartbeat]);
  await monitorQueue();
});

async function heartbeat() {
  connection.emit("heartbeat", "ok");
  console.log("heartbeat", "ok");
  await setTimeout(1500);
  return heartbeat();
}
