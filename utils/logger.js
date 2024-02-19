var logger = require("winston");
const TelegramLogger = require("winston-telegram");

if (process.env.MODE === "PROD") {
  logger.add(
    new TelegramLogger({
      token: "6410812148:AAHQjYqPXfCvDcpBv68PDrRJeOpJB_Ob2WY",
      chatId: "-4168143961",
      level: "info",
      unique: false,
    })
  );
}

module.exports = logger;
