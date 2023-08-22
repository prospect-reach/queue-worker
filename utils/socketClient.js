const {io: socket} = require("socket.io-client");

const connection = socket("wss://upload-file-handler.onrender.com:443");

module.exports = {
  connection,
};
