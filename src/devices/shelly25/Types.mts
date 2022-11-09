import { LocalDatapoint } from "jm-castle-ac-dc-types/dist/All.mjs";
import { makeDatacollectorPart } from "../../engines/data-collector/parts/RestfulDevice.mjs";
import { DeviceType } from "../DeviceTypes.mjs";
import {
  executeControlRequestOnDevice,
  fetchStatusFromDevice,
} from "./Status.mjs";
export const exampleStatus = {
  wifi_sta: {
    connected: true,
    ssid: "1101W24",
    ip: "192.168.178.31",
    rssi: -48,
  },
  cloud: { enabled: true, connected: true },
  mqtt: { connected: false },
  time: "13:21",
  unixtime: 1665487317,
  serial: 21,
  has_update: false,
  mac: "4C7525346296",
  cfg_changed_cnt: 2,
  actions_stats: { skipped: 0 },
  relays: [
    {
      ison: false,
      has_timer: false,
      timer_started: 0,
      timer_duration: 0,
      timer_remaining: 0,
      overpower: false,
      overtemperature: false,
      is_valid: true,
      source: "http",
    },
    {
      ison: false,
      has_timer: false,
      timer_started: 0,
      timer_duration: 0,
      timer_remaining: 0,
      overpower: false,
      overtemperature: false,
      is_valid: true,
      source: "input",
    },
  ],
  meters: [
    {
      power: 0.0,
      overpower: 0.0,
      is_valid: true,
      timestamp: 1665494517,
      counters: [0.0, 0.0, 0.0],
      total: 0,
    },
    {
      power: 0.0,
      overpower: 0.0,
      is_valid: true,
      timestamp: 1665494517,
      counters: [0.0, 0.0, 0.0],
      total: 0,
    },
  ],
  inputs: [
    { input: 0, event: "", event_cnt: 0 },
    { input: 0, event: "", event_cnt: 0 },
  ],
  temperature: 39.56,
  overtemperature: false,
  tmp: { tC: 39.56, tF: 103.21, is_valid: true },
  temperature_status: "Normal",
  update: {
    status: "idle",
    has_update: false,
    new_version: "20220809-123456/v1.12-g99f7e0b",
    old_version: "20220809-123456/v1.12-g99f7e0b",
  },
  ram_total: 50728,
  ram_free: 36352,
  fs_size: 233681,
  fs_free: 146082,
  voltage: 226.55,
  uptime: 755,
};

export const deviceTypeId = "shelly-2-5";

export type Shelly25Status = typeof exampleStatus;

const exampleRelayControlResponse = {
  ison: false,
  has_timer: false,
  timer_started: 0,
  timer_duration: 0,
  timer_remaining: 0,
  overpower: false,
  overtemperature: false,
  is_valid: true,
  source: "http",
};

export type Shelly25RelayControlResponse = typeof exampleRelayControlResponse;

export type Shelly25DatapointId =
  | "voltage"
  | "power-1"
  | "power-2"
  | "inner-temperature"
  | "relay-state-1"
  | "relay-state-2"
  | "relay-control-1"
  | "relay-control-2"
  | "energy-counter-total-1"
  | "energy-counter-total-2";

export const deviceDatapoints = (): Partial<
  Record<Shelly25DatapointId, LocalDatapoint>
> => ({
  voltage: {
    localId: "voltage",
    name: "Aktuelle Spannung",
    valueType: "number",
    valueUnit: "V",
  },
  "power-1": {
    localId: "power-1",
    name: "Leistung 1 aktuell",
    valueType: "number",
    valueUnit: "W",
  },
  "power-2": {
    localId: "power-2",
    name: "Leistung 2 aktuell",
    valueType: "number",
    valueUnit: "W",
  },
  "inner-temperature": {
    localId: "inner-temperature",
    name: "Temperatur im Shelly",
    valueType: "number",
    valueUnit: "°C",
  },
  "relay-state-1": {
    localId: "relay-state-1",
    name: "Status Relais 1",
    valueType: "boolean",
  },
  "relay-state-2": {
    localId: "relay-state-2",
    name: "Status Relais 2",
    valueType: "boolean",
  },
  "energy-counter-total-1": {
    localId: "energy-counter-total-1",
    name: "Energiezähler 1",
    note: "Wird nur 1x pro Min. im Shelly aktualisiert.",
    valueType: "number",
    valueUnit: "Wmin",
  },
  "energy-counter-total-2": {
    localId: "energy-counter-total-2",
    name: "Energiezähler 2",
    note: "Wird nur 1x pro Min. im Shelly aktualisiert.",
    valueType: "number",
    valueUnit: "Wmin",
  },
});

export const controlDatapoints = (): Partial<
  Record<Shelly25DatapointId, LocalDatapoint>
> => {
  return {
    "relay-control-1": {
      localId: "relay-control-1",
      name: "Steuerung Relais 1",
      valueType: "boolean",
    },
    "relay-control-2": {
      localId: "relay-control-2",
      name: "Steuerung Relais 2",
      valueType: "boolean",
    },
  };
};

export const Shelly25: DeviceType = {
  id: deviceTypeId,
  name: "Shelly 2.5",
  isSimulation: false,
  datapoints: deviceDatapoints(),
  controlDatapoints: controlDatapoints(),
  examples: [
    {
      id: "example-shelly-2-5",
      ipAddress: "192.168.178.20",
      webInterface: "http://192.168.178.20",
      api: "http://192.168.178.20",
      type: deviceTypeId,
    },
  ],
  makeDatacollectorPart,
  fetchStatus: fetchStatusFromDevice,
  executeControlRequest: executeControlRequestOnDevice,
  disconnectFromDevice: async () => {
    return;
  },
};
