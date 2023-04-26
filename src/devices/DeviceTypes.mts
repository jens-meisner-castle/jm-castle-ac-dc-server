import {
  DatapointState,
  Device,
  DeviceControlResponse,
  DeviceStatus,
  DeviceTypeId,
  LocalDatapoint,
  SimulationDeviceTypeId,
  SimulationSpec,
} from "jm-castle-ac-dc-types";
import { DatacollectorPart } from "../engines/data-collector/Types.mjs";
import { EngineContextConsumer } from "../engines/Types.mjs";
import { BosswerkMi600 } from "./bosswerkMi600/Types.mjs";
import { DeviceInstance } from "./DeviceInstance.mjs";
import { MqttClientType } from "./mqtt/Types.mjs";
import { Shelly1 } from "./shelly1/Types.mjs";
import { Shelly1PM } from "./shelly1PM/Types.mjs";
import { Shelly25 } from "./shelly25/Types.mjs";
import { ShellyPlugS } from "./shellyPlugS/Types.mjs";
import { SimulationConstType } from "./simulation/const/Types.mjs";
import { SimulationDayAndNightType } from "./simulation/day-night/Types.mjs";
import { SimulationFileType } from "./simulation/file/Types.mjs";
import { SimulationSecondsType } from "./simulation/seconds/Types.mjs";
import { HichiSmlReader } from "./hichiSmlReader/Types.mjs";

export type DeviceType = {
  id: DeviceTypeId;
  name: string;
  description?: string;
  examples?: Device[];
  isSimulation: boolean;
  simulation?: SimulationSpec;
  datapoints: Record<string, LocalDatapoint>;
  controlDatapoints: Record<string, LocalDatapoint>;
  fetchStatus: (deviceInstance: DeviceInstance) => Promise<DeviceStatus>;
  executeControlRequest?: (
    device: Device,
    states: DatapointState[]
  ) => Promise<DeviceControlResponse>;
  makeDatacollectorPart?: (
    deviceInstance: DeviceInstance,
    ...datapoints: string[]
  ) => Promise<DatacollectorPart>;
  disconnectFromDevice: (deviceInstance: DeviceInstance) => Promise<void>;
  addDeviceEventConsumer?: (
    consumer: EngineContextConsumer,
    device: Device
  ) => void;
};

const allDevices: Record<DeviceTypeId, DeviceType> = {
  "shelly-1": Shelly1,
  "shelly-1-pm": Shelly1PM,
  "shelly-plug-s": ShellyPlugS,
  "shelly-2-5": Shelly25,
  "bosswerk-mi-600": BosswerkMi600,
  "hichi-sml-reader": HichiSmlReader,
  "sim-seconds": SimulationSecondsType,
  "sim-const": SimulationConstType,
  "sim-file": SimulationFileType,
  "sim-day-night": SimulationDayAndNightType,
  mqtt: MqttClientType,
};

export const supportedDeviceTypes = allDevices;

export const isSimulation = (
  deviceType: DeviceTypeId
): deviceType is SimulationDeviceTypeId => {
  const type = supportedDeviceTypes[deviceType];
  return type ? type.isSimulation : false;
};
