const supabase = require("./db");
const {httpServer, io} = require("./socket");
const {setTimeout} = require("timers/promises");
const importFromFileToQueue = require("./importFromFile");
const fetch = require("node-fetch");
const csv = require("csvtojson");
const {uploadCompaniesAndLeads} = require("./import");
const logger = require("./logger");
const {io: socket} = require("socket.io-client");

const connection = socket("wss://upload-file-handler.onrender.com:443");

async function monitorQueue() {
  connection.emit("heartbeat", "ok");

  const {data, error} = await supabase
    .from("queue")
    .select()
    .eq("task_type", "import_from_file")
    .match({state: "planned"})
    .lt("start_at", new Date().toISOString())
    .limit(1);

  if (error) {
    console.error(JSON.stringify(error));
  }

  if (data.length > 0) {
    console.log("message", data.length + "records found");

    for (let i = 0; i < data.length; i++) {
      const {error} = await supabase.from("queue").update({state: "running"}).eq("id", data[i].id);
      if (error) {
        console.log(error);
      }
    }

    const _fileUrl = "public/" + data[0].url;

    const {data: fileURL, error: fileError} = await supabase.storage.from("reports").download("public/" + data[0].url);

    if (fileError) {
      console.log(fileError);
    }

    const parser = csv({
      delimiter: [","],
      trim: true,
    });

    logger.info("Processing file: " + data[0].url.split(" - ")[1]);

    const records = await parser.fromString(await fileURL.text(), {
      defaultEncoding: "utf8",
    });

    const payload = JSON.parse(data[0].payload);

    await uploadCompaniesAndLeads(records, data[0].url, data[0].domain, payload.template, payload.delay, payload.emailClass, payload.sendAt);

    for (let i = 0; i < data.length; i++) {
      const {error} = await supabase.from("queue").update({state: "complete", finished_at: new Date().toISOString()}).eq("id", data[i].id);
      if (error) {
        console.log(error);
      }
    }

    await setTimeout(1500);

    return await monitorQueue();
  }

  console.log("no records found");
  console.log(".");
  console.log(".");
  await setTimeout(3000);

  return await monitorQueue();
}

module.exports = monitorQueue;
