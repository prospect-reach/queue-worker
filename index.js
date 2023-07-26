const supabase = require("./utils/db");
const {httpServer, io} = require("./utils/socket");
const monitorQueue = require("./utils/queue");
const {setTimeout} = require("timers/promises");

io.on("connection", async (socket) => {
  await monitorQueue();
});

httpServer.listen(3000, async () => {
  await monitorQueue();
});

async function heartbeat() {
  io.emit("heartbeat", "ok");
  console.log("heartbeat", "ok");
  await setTimeout(1500);
  return heartbeat();
}
