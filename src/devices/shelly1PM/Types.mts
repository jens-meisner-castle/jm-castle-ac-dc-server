import { makeDatacollectorPart } from "../../engines/data-collector/parts/RestfulDevice.mjs";
import { LocalDatapoint } from "../../Types.mjs";
import { DeviceType } from "../DeviceTypes.mjs";
import { fetchStatusFromDevice } from "./Status.mjs";

export const example = {
  wifi_sta: {
    connected: true,
    ssid: "1101W24",
    ip: "192.168.178.26",
    rssi: -61,
  },
  cloud: { enabled: true, connected: true },
  mqtt: { connected: false },
  time: "11:54",
  unixtime: 1666950863,
  serial: 13,
  has_update: false,
  mac: "BCFF4DFCB59B",
  cfg_changed_cnt: 0,
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
      timestamp: 1666958063,
      counters: [0.0, 0.0, 0.0],
      total: 0,
    },
  ],
  inputs: [{ input: 0, event: "", event_cnt: 0 }],
  temperature: 26.01,
  overtemperature: false,
  tmp: { tC: 26.01, tF: 78.82, is_valid: true },
  temperature_status: "Normal",
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
    new_version: "20220809-124723/v1.12-g99f7e0b",
    old_version: "20220809-124723/v1.12-g99f7e0b",
    beta_version: "20221014-091548/v1.12.1-rc1-gd2158aa",
  },
  ram_total: 51272,
  ram_free: 37984,
  fs_size: 233681,
  fs_free: 148843,
  uptime: 204,
};

export const deviceTypeId = "shelly-1-pm";

export type Shelly1PMStatus = typeof example;

export type Shelly1PMDatapointId =
  | "power"
  | "inner-temperature"
  | "external-temperature-1"
  | "external-temperature-2"
  | "external-temperature-3"
  | "relay-state"
  | "relay-control"
  | "energy-sum-prev-minute-1"
  | "energy-sum-prev-minute-2"
  | "energy-sum-prev-minute-3"
  | "energy-counter-total";

export const deviceDatapoints = (): Partial<
  Record<Shelly1PMDatapointId, LocalDatapoint>
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
  Record<Shelly1PMDatapointId, LocalDatapoint>
> => {
  return {
    "relay-control": {
      localId: "relay-control",
      name: "Steuerung Relais",
      valueType: "boolean",
    },
  };
};

export const Shelly1PM: DeviceType = {
  id: deviceTypeId,
  name: "Shelly 1PM",
  isSimulation: false,
  datapoints: deviceDatapoints(),
  controlDatapoints: controlDatapoints(),
  examples: [
    {
      id: "example-shelly-1-pm",
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
