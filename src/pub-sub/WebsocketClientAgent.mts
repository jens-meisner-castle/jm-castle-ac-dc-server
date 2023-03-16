import {
  DatapointState,
  isWsMessage,
  msg_pong,
  msg_publish,
  msg_welcome,
  WsMessage,
} from "jm-castle-ac-dc-types";
import { WebSocket } from "ws";
import {
  ControlContextConsumer,
  EngineContextConsumer,
} from "../engines/Types.mjs";
import { CastleAcDc } from "../system/status/System.mjs";

let counter = 0;

export class WebsocketClientAgent {
  constructor(socket: WebSocket, system: CastleAcDc, remoteAddress: string) {
    counter++;
    this.id = `${counter}:${remoteAddress}`;
    this.system = system;
    this.socket = socket;

    socket.on("message", (data) => {
      const str = data.toString("utf-8");
      try {
        const msg = JSON.parse(str);
        if (isWsMessage(msg)) {
          this.consumeMessage(msg);
        }
      } catch (error) {
        console.error(
          `Receiving error when consuming message (${str}): ${error.toString()}`
        );
      }
    });
    this.sendMessage(msg_welcome());
  }

  private cleanup: (() => void)[] = [];
  private id: string;
  private system: CastleAcDc;
  private socket: WebSocket;
  private datastateConsumer: EngineContextConsumer;
  private controlstateConsumer: ControlContextConsumer;

  public handleClose = () => {
    // after the socket was closed
    this.cleanup.forEach((fn) => fn());
  };

  private disconnectFromSystemDatastate = () => {
    const consumer = this.datastateConsumer;
    this.datastateConsumer = undefined;
    this.system.removeConsumerOnDatastate(consumer);
  };

  private disconnectFromSystemControlHistory = () => {
    const consumer = this.controlstateConsumer;
    this.controlstateConsumer = undefined;
    this.system.removeConsumerOnControlHistories(consumer);
  };

  private connectToSystemDatastate = async () => {
    if (this.datastateConsumer) {
      return;
    }
    const currentData = await this.system.getDatastateContent();
    this.cleanup.push(this.disconnectFromSystemDatastate);
    this.sendMessage(msg_publish("/system/data-state", currentData));
    this.datastateConsumer = {
      onContextChange: async (context) => {
        const copiedContext = context.copy();
        const pointsAndStates = copiedContext.resetDatapoints();
        const datapoints = await this.system.getStateDatapoints();
        const datapointStates: Record<string, DatapointState> = {};
        Object.keys(datapoints).forEach((k) => {
          const datapoint = datapoints[k];
          const pointAndState = pointsAndStates[k];
          datapointStates[k] = pointAndState
            ? pointAndState.state
            : { id: datapoint.id, at: Date.now() };
        });
        const sequences = copiedContext.resetSequences();
        const data = { datapoints, datapointStates, sequences };
        this.sendMessage(msg_publish("/system/data-state", data));
      },
    };
    this.system.addConsumerOnDatastate(this.datastateConsumer);
  };

  private connectToSystemControlHistory = async () => {
    if (this.controlstateConsumer) {
      return;
    }
    const historyContent = await this.system.getControlstateContent();
    this.cleanup.push(this.disconnectFromSystemControlHistory);
    this.sendMessage(msg_publish("/system/control-history", historyContent));
    this.controlstateConsumer = {
      onControlContextChange: async (context) => {
        historyContent.controls[context.getEngineId()] = {
          context: context.getSerializable(),
        };
        this.sendMessage(
          msg_publish("/system/control-history", historyContent)
        );
      },
    };
    this.system.addConsumerOnControlHistories(this.controlstateConsumer);
  };

  private consumeSubscribeMessage = async (msg: WsMessage) => {
    const { params } = msg;
    const topic = params?.topic;
    if (topic) {
      switch (topic) {
        case "/system/data-state":
          await this.connectToSystemDatastate();
          break;
        case "/system/control-history":
          await this.connectToSystemControlHistory();
          break;
      }
    }
  };

  private consumeMessage = (msg: WsMessage) => {
    const { method } = msg;
    switch (method) {
      case "welcome":
        break;
      case "ping":
        return this.sendMessage(msg_pong());
      case "pong":
        break;
      case "subscribe":
        return this.consumeSubscribeMessage(msg);
      default:
        console.error(
          `Unable to consume message (method: ${method}): ${JSON.stringify(
            msg
          )}`
        );
    }
  };

  private sendMessage = (msg: WsMessage) => {
    const buffer = Buffer.from(JSON.stringify(msg), "utf-8");
    this.socket.send(buffer);
  };
}
