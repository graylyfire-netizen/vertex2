module.exports = {
  DB_URL: process.env.DB_URL,

  isBeta: process.env.IS_BETA === "true",
  debug: false,
  disconnectTimer: false,

  error_log_channel: "1470370208047960107",
  command_logs: "1470370208047960107",

  guildsWhitelist: [
    "1411468358079090720",
    "1412478276512776227",
    "1449610719552339980",
    "1470369536443285630"
  ]
};