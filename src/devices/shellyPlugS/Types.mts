import { LocalDatapoint } from "jm-castle-ac-dc-types";
import { makeDatacollectorPart } from "../../engines/data-collector/parts/RestfulDevice.mjs";
import { DeviceType } from "../DeviceTypes.mjs";
import { fetchStatusFromDevice } from "./Status.mjs";
export const example = {
  wifi_sta: {
    connected: true,
    ssid: "1101W24",
    ip: "192.168.178.30",
    rssi: -49,
  },
  cloud: { enabled: true, connected: true },
  mqtt: { connected: false },
  time: "17:24",
  unixtime: 1669739057,
  serial: 10,
  has_update: false,
  mac: "C8C9A3A4D87E",
  cfg_changed_cnt: 1,
  actions_stats: { skipped: 0 },
  relays: [
    {
      ison: true,
      has_timer: false,
      timer_started: 0,
      timer_duration: 0,
      timer_remaining: 0,
      overpower: false,
      source: "input",
    },
  ],
  meters: [
    {
      power: 0.0,
      overpower: 0.0,
      is_valid: true,
      timestamp: 1669742657,
      counters: [0.0, 0.0, 0.0],
      total: 0,
    },
  ],
  temperature: 28.43,
  overtemperature: false,
  tmp: { tC: 28.43, tF: 83.17, is_valid: true },
  update: {
    status: "idle",
    has_update: false,
    new_version: "20221027-101131/v1.12.1-ga9117d3",
    old_version: "20221027-101131/v1.12.1-ga9117d3",
  },
  ram_total: 52072,
  ram_free: 38928,
  fs_size: 233681,
  fs_free: 166664,
  uptime: 517,
};

export const deviceTypeId = "shelly-plug-s";

export type ShellyPlugSStatus = typeof example;

export type ShellyPlugSDatapointId =
  | "power"
  | "inner-temperature"
  | "relay-state"
  | "relay-control"
  | "energy-sum-prev-minute-1"
  | "energy-sum-prev-minute-2"
  | "energy-sum-prev-minute-3"
  | "energy-counter-total";

export const deviceDatapoints = (): Partial<
  Record<ShellyPlugSDatapointId, LocalDatapoint>
> => ({
  power: {
    localId: "power",
    name: "Leistung aktuell",
    valueType: "number",
    valueUnit: "W",
  },
  "inner-temperature": {
    localId: "inner-temperature",
    name: "Temperatur im Shelly",
    valueType: "number",
    valueUnit: "°C",
  },
  "relay-state": {
    localId: "relay-state",
    name: "Status des Relays (true = Strom fließt)",
    valueType: "boolean",
  },
  "energy-counter-total": {
    localId: "energy-counter-total",
    name: "Energiezähler gesamt",
    note: "Wird nur 1x pro Min. im Shelly aktualisiert.",
    valueType: "number",
    valueUnit: "Wmin",
  },
  "energy-sum-prev-minute-1": {
    localId: "energy-sum-prev-minute-1",
    name: "Energiezähler vor 1 Minute",
    note: "Wird nur 1x pro Min. im Shelly aktualisiert.",
    valueType: "number",
    valueUnit: "Wmin",
  },
  "energy-sum-prev-minute-2": {
    localId: "energy-sum-prev-minute-2",
    name: "Energiezähler vor 2 Minuten",
    note: "Wird nur 1x pro Min. im Shelly aktualisiert.",
    valueType: "number",
    valueUnit: "Wmin",
  },
  "energy-sum-prev-minute-3": {
    localId: "energy-sum-prev-minute-3",
    name: "Energiezähler vor 3 Minuten",
    note: "Wird nur 1x pro Min. im Shelly aktualisiert.",
    valueType: "number",
    valueUnit: "Wmin",
  },
});

export const controlDatapoints = (): Partial<
  Record<ShellyPlugSDatapointId, LocalDatapoint>
> => {
  return {
    "relay-control": {
      localId: "relay-control",
      name: "Steuerung Relais",
      valueType: "boolean",
    },
  };
};

export const ShellyPlugS: DeviceType = {
  id: deviceTypeId,
  name: "Shelly PlugS",
  isSimulation: false,
  datapoints: deviceDatapoints(),
  controlDatapoints: controlDatapoints(),
  examples: [
    {
      id: "example-shelly-plug-s",
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
