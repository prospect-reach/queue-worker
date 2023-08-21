var logger = require("winston");
const TelegramLogger = require("winston-telegram");

logger.add(
  new TelegramLogger({
    token: "6410812148:AAHQjYqPXfCvDcpBv68PDrRJeOpJB_Ob2WY",
    chatId: "-883389243",
    level: "info",
    unique: false,
  })
);

module.exports = logger;
