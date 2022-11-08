import { config } from "dotenv";
import { createServer } from "http";
import {
  configFilePath,
  readJsonFile,
} from "./configuration/Configuration.mjs";
import { newExpressApp } from "./express-app.mjs";
import { PubSubWebsocketServer } from "./pub-sub/PubSubWebsocketServer.mjs";
import {
  CastleAcDc,
  getCurrentSystem,
  setCurrentSystem,
} from "./system/status/System.mjs";
import { Configuration } from "./Types.mjs";

const normalizePort = (val: string) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
};

const onListening = () => {
  const addr = server.address();
  const bind =
    typeof addr === "string"
      ? "pipe " + addr
      : "port " + (addr ? addr.port : 53000);
  console.log("Listening on " + bind);
};

const onError = (error: any) => {
  if (error.syscall !== "listen") {
    throw error;
  }
  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

config();

// load config and create CastleAcDc
const filePath = configFilePath();
console.log("reading config from file:", filePath);
const configuration = readJsonFile<Configuration>(filePath);
const system = new CastleAcDc(configuration);
setCurrentSystem(system);
await system.start();

const port = normalizePort(process.env.PORT || "53000");

const app = newExpressApp(port);

const server = createServer(app);

new PubSubWebsocketServer(server, getCurrentSystem);

server.on("error", onError);
server.on("listening", onListening);

server.listen(port);
