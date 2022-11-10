import { DeviceTypeId, LocalDatapoint } from "jm-castle-ac-dc-types";
import { makeDatacollectorPart } from "../../engines/data-collector/parts/RestfulDevice.mjs";
import { DeviceType } from "../DeviceTypes.mjs";
import { fetchStatusFromDevice } from "./Status.mjs";

export const example = {
  wifi_sta: {
    connected: true,
    ssid: "1101W24",
    ip: "192.168.178.37",
    rssi: -66,
  },
  cloud: { enabled: true, connected: true },
  mqtt: { connected: false },
  time: "16:49",
  unixtime: 1667317790,
  serial: 4,
  has_update: false,
  mac: "244CAB44198B",
  cfg_changed_cnt: 2,
  actions_stats: { skipped: 0 },
  relays: [
    {
      ison: false,
      has_timer: false,
      timer_started: 0,
      timer_duration: 0,
      timer_remaining: 0,
      source: "input",
    },
  ],
  meters: [{ power: 0.0, is_valid: true }],
  inputs: [{ input: 0, event: "", event_cnt: 0 }],
  ext_sensors: { temperature_unit: "C" },
  ext_temperature: {
    "0": { hwID: "2884950a00000056", tC: 21.25, tF: 70.25 },
    "1": { hwID: "2884950a00000056", tC: 21.25, tF: 70.25 },
    "2": { hwID: "2884950a00000056", tC: 21.25, tF: 70.25 },
  },
  ext_humidity: {},
  update: {
    status: "idle",
    has_update: false,
    new_version: "20221027-091427/v1.12.1-ga9117d3",
    old_version: "20221027-091427/v1.12.1-ga9117d3",
  },
  ram_total: 51688,
  ram_free: 38728,
  fs_size: 233681,
  fs_free: 150851,
  uptime: 619,
};

const deviceTypeId: DeviceTypeId = "shelly-1";

export type Shelly1Status = typeof example;

export type Shelly1DatapointId =
  | "external-temperature-1"
  | "external-temperature-2"
  | "external-temperature-3"
  | "relay-state"
  | "relay-control";

export const deviceDatapoints = (): Partial<
  Record<Shelly1DatapointId, LocalDatapoint>
> => ({
  "external-temperature-1": {
    localId: "external-temperature-1",
    name: "Temperatur extern 1",
    valueType: "number",
    valueUnit: "°C",
  },
  "external-temperature-2": {
    localId: "external-temperature-2",
    name: "Temperatur extern 2",
    valueType: "number",
    valueUnit: "°C",
  },
  "external-temperature-3": {
    localId: "external-temperature-3",
    name: "Temperatur extern 3",
    valueType: "number",
    valueUnit: "°C",
  },
  "relay-state": {
    localId: "relay-state",
    name: "Status des Relays (true = Strom fließt)",
    valueType: "boolean",
  },
});

export const controlDatapoints = (): Partial<
  Record<Shelly1DatapointId, LocalDatapoint>
> => {
  return {
    "relay-control": {
      localId: "relay-control",
      name: "Steuerung Relais",
      valueType: "boolean",
    },
  };
};

export const Shelly1: DeviceType = {
  id: deviceTypeId,
  name: "Shelly 1",
  isSimulation: false,
  datapoints: deviceDatapoints(),
  controlDatapoints: controlDatapoints(),
  examples: [
    {
      id: "example-shelly-1",
      ipAddress: "192.168.178.20",
      webInterface: "http://192.168.178.20",
      api: "http://192.168.178.20",
      type: deviceTypeId,
    },
  ],
  makeDatacollectorPart,
  fetchStatus: fetchStatusFromDevice,
  disconnectFromDevice: async () => {
    return;
  },
};
