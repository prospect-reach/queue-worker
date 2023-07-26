const fetch = require("node-fetch");
const csv = require("csvtojson");

async function importFromFileToQueue(url) {
  const file = await fetch(url);

  const parser = csv({
    delimiter: [","],
    trim: true,
  });
  const records = await parser.fromStream(file.body, {
    defaultEncoding: "utf8",
  });

  for (let record of records) {
    const { data, error } = await supabase.from("queue").insert({
      domain: 4,
      task_type: "send_email",
      payload: record,
      state: "pending",
    });
  }
}

module.exports = importFromFileToQueue;
