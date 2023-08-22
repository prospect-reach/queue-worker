const supabase = require("./utils/db");
const {httpServer, io} = require("./utils/socket");
const monitorQueue = require("./utils/queue");
const {setTimeout} = require("timers/promises");
const logger = require("./utils/logger");
const {connection} = require("./utils/socketClient");

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
  connection.emit("server_started", `server_started`);
  logger.info(`Background Queue Worker - ${process.env["MODE"]}Server started`);
  // await Promise.all([monitorQueue, heartbeat]);
  await monitorQueue();
});

async function heartbeat() {
  connection.emit("heartbeat", "ok");
  console.log("heartbeat", "ok");
  await setTimeout(1500);
  return heartbeat();
}
