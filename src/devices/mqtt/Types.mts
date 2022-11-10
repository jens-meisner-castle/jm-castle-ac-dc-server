import { Device, DeviceTypeId } from "jm-castle-ac-dc-types";
import { makeDatacollectorPart } from "../../engines/data-collector/parts/PublishingDevice.mjs";
import { DatacollectorPart } from "../../engines/data-collector/Types.mjs";
import { EngineContextConsumer } from "../../engines/Types.mjs";
import { DeviceInstance } from "../DeviceInstance.mjs";
import { DeviceType } from "../DeviceTypes.mjs";
import {
  fetchStatusFromMqttClient,
  getMqttClient,
  getOrStartMqttClient,
  removeMqttClient,
} from "./Status.mjs";

const deviceTypeId: DeviceTypeId = "mqtt";

const fetchStatus = (deviceInstance: DeviceInstance) =>
  fetchStatusFromMqttClient(deviceInstance);

const disconnectFromDevice = async (
  deviceInstance: DeviceInstance
): Promise<void> => {
  const mqttClient = getMqttClient(deviceInstance.getDevice());
  if (!mqttClient) {
    return;
  }
  await mqttClient.disconnect();
  removeMqttClient(deviceInstance.getDevice());
};

const makeMqttDatacollectorPart = async (
  deviceInstance: DeviceInstance,
  ...datapoints: string[]
): Promise<DatacollectorPart> => {
  const mqttClient = await getOrStartMqttClient(deviceInstance);
  await mqttClient.subscribeTo(datapoints);
  return makeDatacollectorPart(deviceInstance, ...datapoints);
};

const addDeviceEventConsumer = (
  consumer: EngineContextConsumer,
  device: Device
) => {
  const mqttClient = getMqttClient(device);
  if (!mqttClient) {
    return;
  }
  mqttClient.addEventConsumer(consumer);
};

export const MqttClientType: DeviceType = {
  id: deviceTypeId,
  name: "Stellt Werte bereit, die von einem mqtt broker kommen (Quelle: api vom Device)",
  isSimulation: false,
  description: `Die URL des mqtt brokers wird in der Eigenschaft "api" (im 'URL-Format') vom Device eingetragen, z.B. "mqtt://192.168.178.20:1883".
  Zusätzlich müssen die Datenpunkte über die Eigenschaft "datapoints" im Device spezifiziert werden. Siehe Beispiel(e). Die Eigenschaft "localId" entspricht dem Topic des Datenpunktes.`,
  datapoints: {},
  controlDatapoints: {},
  examples: [
    {
      id: "example-mosquitto-mqtt",
      ipAddress: "192.168.178.20",
      webInterface: undefined,
      api: "mqtt://192.168.178.20:1883",
      type: deviceTypeId,
      datapoints: {
        power: {
          localId: "$SYS/broker/clients/connected",
          name: "Verbundene clients",
          valueType: "number",
        },
      },
    },
  ],
  makeDatacollectorPart: makeMqttDatacollectorPart,
  fetchStatus,
  disconnectFromDevice,
  addDeviceEventConsumer,
};
