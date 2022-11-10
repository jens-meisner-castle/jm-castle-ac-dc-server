import {
  DatapointState,
  Device,
  DeviceStatus,
  EngineControlResponse,
} from "jm-castle-ac-dc-types";
import { DateTime } from "luxon";
import {
  Client,
  ClientSubscribeCallback,
  connect,
  OnMessageCallback,
} from "mqtt";
import {
  ContextDatapoints,
  EngineContext,
} from "../../engines/EngineContext.mjs";
import { EngineContextConsumer } from "../../engines/Types.mjs";
import { getDateFormat } from "../../utils/Format.mjs";
import { DeviceInstance } from "../DeviceInstance.mjs";

const activeMqttClients: Record<string, MqttClient> = {};

export const getMqttClient = (device: Device): MqttClient | undefined => {
  return activeMqttClients[device.id];
};

export const removeMqttClient = (device: Device) => {
  delete activeMqttClients[device.id];
};

export const getOrStartMqttClient = async (
  deviceInstance: DeviceInstance
): Promise<MqttClient> => {
  let client = activeMqttClients[deviceInstance.getDevice().id];
  if (!client) {
    client = new MqttClient(deviceInstance);
    activeMqttClients[deviceInstance.getDevice().id] = client;
    await client.start();
  }
  return client;
};

export const fetchStatusFromMqttClient = async (
  deviceInstance: DeviceInstance
) => {
  const client = await getOrStartMqttClient(deviceInstance);
  return await client.fetchStatus();
};

export class MqttClient {
  constructor(deviceInstance: DeviceInstance) {
    this.deviceInstance = deviceInstance;
  }

  private subscribedTopics: string[] = [];
  private state: Record<string, DatapointState> = {};
  private deviceInstance: DeviceInstance;
  private client: Client;
  private eventConsumers: EngineContextConsumer[] = [];

  public addEventConsumer = (consumer: EngineContextConsumer) =>
    this.eventConsumers.push(consumer);

  public start = async (): Promise<EngineControlResponse> => {
    try {
      const { api } = this.deviceInstance.getDevice();
      this.client = connect(api);
      this.client.on("message", this.onMessageCallback);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };

  public stop = async (): Promise<EngineControlResponse> => {
    if (this.client && this.client.connected) {
      this.subscribedTopics.length &&
        this.client.unsubscribe(this.subscribedTopics);
      this.subscribedTopics = [];
      this.client.end();
    }
    return { success: true };
  };

  public disconnect = async (): Promise<void> => {
    if (this.client && this.client.connected) {
      this.client.end(true);
    }
  };

  private onMessageCallback: OnMessageCallback = (topic, payload) => {
    const valueStr = payload.toString("utf-8");
    const datapoints = this.deviceInstance.getDevice().datapoints;
    const datapoint = datapoints[topic];
    if (datapoint) {
      let valueNum: number | undefined = undefined;
      let valueString: string | undefined;
      switch (datapoint.valueType) {
        case "number": {
          valueNum = parseFloat(valueStr);
          break;
        }
        case "date": {
          valueNum = parseFloat(valueStr);
          valueString = DateTime.fromMillis(valueNum).toFormat(
            getDateFormat("millisecond")
          );
          break;
        }
        case "string": {
          valueString = valueStr;
          break;
        }
        case "boolean": {
          valueString =
            valueStr === "true" || valueStr === "1" ? "true" : "false";
          valueNum = valueStr === "true" || valueStr === "1" ? 1 : 0;
          break;
        }
      }
      this.state[topic] = {
        id: topic,
        valueNum,
        valueString,
        at: Date.now(),
      };
      if (this.eventConsumers.length) {
        const datapoints: ContextDatapoints = {};
        Object.keys(this.state).forEach((k) => {
          const publicDatapoint =
            this.deviceInstance.getPublicDatapointForPrivateLocalId(k);
          publicDatapoint &&
            (datapoints[k] = {
              state: { ...this.state[k], id: publicDatapoint.id },
              point: publicDatapoint,
            });
        });
        const context = new EngineContext({ datapoints });
        for (let i = 0; i < this.eventConsumers.length; i++) {
          const consumner = this.eventConsumers[i];
          consumner.onContextChange(context);
        }
      }
    }
  };

  private onSubscribeCallback: ClientSubscribeCallback = (err, grants) => {
    grants.forEach((grant) => {
      const { topic } = grant;
      this.subscribedTopics.push(topic);
    });
  };

  public subscribeTo = async (topics: string[]) => {
    if (!this.client) {
      throw new Error(
        `Mqtt client is undefined. Unable to subscribe to ${topics.join(", ")}`
      );
    }
    const newTopics = topics.filter(
      (topic) => !this.subscribedTopics.includes(topic)
    );
    newTopics.length &&
      this.client.subscribe(newTopics, this.onSubscribeCallback);
  };
  public unsubscribeFrom = (topics: string[]) => {
    this.client.unsubscribe(topics);
    this.subscribedTopics = this.subscribedTopics.filter(
      (topic) => !topics.includes(topic)
    );
  };

  private getValues = () => {
    const values: Record<string, DatapointState> = { ...this.state };
    return values;
  };

  public fetchStatus = async (): Promise<DeviceStatus> => {
    const accessedAtDateTime = DateTime.now();
    const responsive = this.client.connected;
    try {
      const datapoints: Record<string, DatapointState> = this.getValues();
      return {
        responsive,
        accessedAt: accessedAtDateTime.toMillis(),
        datapoints,
      };
    } catch (error) {
      return {
        responsive: false,
        accessedAt: accessedAtDateTime.toMillis(),
        error: error.toString(),
        datapoints: {},
      };
    }
  };
}
