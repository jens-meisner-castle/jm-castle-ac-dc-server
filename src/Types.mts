import { DateTime, Duration } from "luxon";

export type AnyDate = Date;
export type AnyNumber = number;
export type AnyString = string;
export type AnyBoolean = boolean;
export type AnyDataValue =
  | AnyString
  | AnyDate
  | AnyNumber
  | AnyBoolean
  | null
  | undefined;

export interface Table {
  id: string;
  columnsFragment: string;
}

export interface TableStatus {
  name: string;
  table: Table;
  isCreated: boolean;
}

export interface SystemSetupStatus {
  database: { name: string; tables: Record<string, TableStatus> };
}

export interface CreateDbResponse {
  cmds: string[];
  result: Record<string, unknown>;
}

export interface CreateTablesResponse {
  cmds: string[];
  result: Record<string, unknown>;
}

export interface ExecuteSetupResponse {
  setup: { createDb: CreateDbResponse; createTables: CreateTablesResponse };
}

export type ControlPartTypeId = "sys-freezers-control" | "sys-action";

export type PhysicalDeviceTypeId =
  | "shelly-1-pm"
  | "shelly-1"
  | "shelly-2-5"
  | "bosswerk-mi-600";

export type SimulationDeviceTypeId =
  | "sim-seconds"
  | "sim-const"
  | "sim-file"
  | "sim-day-night";

export type DeviceTypeId =
  | PhysicalDeviceTypeId
  | SimulationDeviceTypeId
  | "mqtt";

export const ValueTypes = {
  number: { id: "number", name: "Eine Zahl" },
  string: { id: "string", name: "Eine Zeichenfolge" },
  boolean: {
    id: "boolean",
    name: "Wahrheitswert (true oder false bzw. 1 oder 0)",
  },
  date: {
    id: "date",
    name: "Datum (formatiert als <yyyy-MM-dd HH:mm:ss> oder numerisch als Millisekundenwert)",
  },
};

export type LuxonKey = "millisecond" | "second" | "minute" | "hour" | "day";

export const DurationUnits = {
  ms: {
    id: "ms",
    name: "Millisekunde",
    cat: "duration",
    luxonKey: "millisecond" as LuxonKey,
  },
  s: {
    id: "s",
    name: "Sekunde",
    cat: "duration",
    luxonKey: "second" as LuxonKey,
  },
  min: {
    id: "min",
    name: "Minute",
    cat: "duration",
    luxonKey: "minute" as LuxonKey,
  },
  h: {
    id: "h",
    name: "Stunde",
    cat: "duration",
    luxonKey: "hour" as LuxonKey,
  },
  d: {
    id: "d",
    name: "Tag",
    cat: "duration",
    luxonKey: "day" as LuxonKey,
  },
};

export type DurationUnit = keyof typeof DurationUnits;

export const ValueUnits = Object.assign({}, DurationUnits, {
  "°C": { id: "°C", name: "Grad Celsius", cat: "temperature" },
  W: { id: "W", name: "Watt", cat: "power" },
  Wmin: { id: "Wmin", name: "Wattminute", cat: "energy" },
  Wh: { id: "Wh", name: "Wattstunde", cat: "energy" },
  kWh: { id: "kWh", name: "Kilowattstunde", cat: "energy" },
  V: { id: "V", name: "Volt", cat: "voltage" },
});

export const isDurationUnit = (s: string): s is DurationUnit =>
  !!DurationUnits[s as DurationUnit];

export const getCategoryOfUnit = (id: keyof typeof ValueUnits) =>
  ValueUnits[id]?.cat;

export type DatapointValueType = keyof typeof ValueTypes;

export type DatapointValueUnit = keyof typeof ValueUnits;

/**
 * @param name beschreibender Name
 * @param note optionale Bemerkungen
 * @param valueType Datentyp
 * @param valueUnit physikalische Einheit (bei valueType = number)
 */
export interface DatapointAspects {
  name: string;
  note?: string;
  valueType: DatapointValueType;
  valueUnit?: keyof typeof ValueUnits;
}

export type LocalDatapointId = string;

export type PublicDatapointId = string;

/**
 * @param id globale id (eindeutig im System)
 */
export type Datapoint = DatapointAspects & {
  deviceId?: never;
  localId?: never;
  id: string;
};

/**
 * @param deviceId id (eindeutig im System) des Geräts, zu dem der Datenpunkt gehört
 * @param localId Gerät lokal eindeutige id des Datenpunktes
 */
export type DeviceDatapoint = DatapointAspects & {
  deviceId: string;
  localId: LocalDatapointId;
  id: string;
};

/**
 * @param localId Gerät lokal eindeutige id des Datenpunktes
 */
export type LocalDatapoint = DatapointAspects & {
  deviceId?: never;
  localId: LocalDatapointId;
  id?: never;
};

export type UniqueDatapoint = Datapoint | DeviceDatapoint;

export const isLocalDatapoint = (
  datapoint: Datapoint | LocalDatapoint | DeviceDatapoint
): datapoint is LocalDatapoint => {
  return !datapoint.id && !datapoint.deviceId;
};

export const isDeviceDatapoint = (
  datapoint: Datapoint | LocalDatapoint | DeviceDatapoint
): datapoint is DeviceDatapoint => {
  return !!datapoint.deviceId && !!datapoint.localId;
};

export interface SimulationSpec {
  dateLevel: "day" | "year";
}

export interface SerializableDeviceType {
  id: DeviceTypeId;
  name: string;
  description?: string;
  isSimulation: boolean;
  simulation?: SimulationSpec;
  examples?: Device[];
  datapoints: Record<string, LocalDatapoint>;
  controlDatapoints: Record<string, LocalDatapoint>;
}

export interface Device {
  id: string;
  ipAddress: string;
  webInterface?: string;
  api: string;
  type: DeviceTypeId;
  datapoints?: Record<string, LocalDatapoint>;
  controlDatapoints?: Record<string, LocalDatapoint>;
  mapControlDatapoints?: Record<
    string,
    | { id?: never; localId?: string; name?: string }
    | { id?: string; localId?: never; name?: string }
  >;
  mapDatapoints?: Record<
    string,
    | { id?: never; localId?: string; name?: string }
    | { id?: string; localId?: never; name?: string }
  >;
}

export interface DatapointState {
  id: string;
  at: number;
  valueNum?: number;
  valueString?: string;
}

export interface DatapointSequence {
  id: string;
  point: UniqueDatapoint;
}

export interface SequenceState {
  id: string;
  at: number;
  data: DatapointState[];
}

export interface DeviceStatus {
  responsive: boolean;
  accessedAt: number;
  error?: string;
  datapoints: Record<string, DatapointState>;
}

export interface EngineSettings {
  lapDuration: number;
}

export interface SerializableEngine {
  key: string;
  settings: EngineSettings;
  actions: Record<string, ActionSpec>;
}

export interface EngineStatus {
  lastStartedAt: number | undefined;
  lastLapEndAt: number | undefined;
  running: boolean;
  duration: {
    consumed: { total: number; lapStart: number; lapEnd: number };
    laps: number;
  };
  errors: { lap: number; errors: string[] }[];
}

export type EngineControlResponse =
  | { success: true; error?: never }
  | { success: false; error: string };

export type SystemControlResponse =
  | { success: true; error?: never }
  | { success: false; error: string };

export type InsertResponse =
  | {
      result: { cmd: string; affectedRows: number };
      error?: never;
      errorDetails?: never;
    }
  | {
      result?: never;
      error: string;
      errorDetails?: Record<string, unknown>;
    };

export type SelectResponse<R> =
  | {
      result: { cmd: string; rows: R[] };
      error?: never;
      errorDetails?: never;
    }
  | {
      result?: never;
      error: string;
      errorDetails?: Record<string, unknown>;
    };

export type SimulationPreviewResponse =
  | {
      result: {
        datapoints: Record<string, UniqueDatapoint>;
        data: Record<string, DatapointState[]>;
      };
      error?: never;
      errorDetails?: never;
    }
  | {
      result?: never;
      error: string;
    };

export type PersistentRow = Record<string, unknown>;

export interface Row_DatapointLog extends PersistentRow {
  datapoint_id: string;
  value_num?: number;
  value_string?: string;
  logged_at: number;
  logged_at_ms: number;
  changed_at: number;
  changed_at_ms: number;
}

export interface Row_DatapointControlLog extends PersistentRow {
  device_id: string;
  datapoint_id: string;
  value_num?: number;
  value_string?: string;
  executed: number;
  success: number;
  logged_at: number;
  logged_at_ms: number;
}

export type Row_AnyLog =
  | Row_DatapointControlLog
  | (Row_DatapointLog & { executed: never; success: never });

export interface QueryParametersSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface SerializableService {
  url: string;
  parameters?: QueryParametersSchema;
  method?: "GET";
  name: string;
  scope?: "public" | "private";
}

export interface DatacollectorSpec {
  lapDuration: number;
  onEvent?: boolean;
  devices: Record<string, { datapoints: string[] }>;
}

export interface DatapointTargetSpec {
  device: string;
  datapoint: LocalDatapointId | PublicDatapointId;
}

type DatapointId = string;

export type DeviceControlRequest = Record<
  DatapointId,
  {
    target: DatapointTargetSpec;
    state: DatapointState;
  } & ControlExecutionSpec
>;

export type SerializableControlPartType = {
  id: ControlPartTypeId;
  name: string;
  description?: string;
  examples?: ControlPartSpec[];
  input: Record<string, Datapoint>;
  output: Record<string, Datapoint>;
};

export type ControlExecutionSpec = { when: "lap-end" | "part-end" | "never" };

export interface ControlPartSpec {
  type: ControlPartTypeId;
  input: Record<string, string>;
  output: Record<string, DatapointTargetSpec & ControlExecutionSpec>;
}

export const PersistenceAreas = {
  "datapoint-log": "Log für Zustand von Datenpunkten",
  "datapoint-control-log": "Log für Steuerung von Datenpunkten",
};

export type DeviceControlResponse =
  | { success: true; error?: never }
  | { success: false; error: string };

export interface StatePersistTargetSpec {
  to: string;
  into: keyof typeof PersistenceAreas;
  datapoints: string[];
}

export interface ControlPersistTargetSpec {
  to: string;
  into: keyof typeof PersistenceAreas;
  datapoints: Record<string, LocalDatapointId[]>;
}

export type DatapointMapping = Record<string, { id: string; name?: string }>;

export interface DatapointCalculationSpec {
  name: string;
  code: string;
  valueType: DatapointValueType;
  valueUnit?: DatapointValueUnit;
}

export const SequenceConditionChangeAspects = {
  value:
    "Add the new state, if the value of the new state is different to the value of the latest state in the sequence.",
  at: "Add the new state, if the date ('at' property) of the new state is different to the date of the latest state in the sequence",
};

export type SequenceCondition = {
  change: keyof typeof SequenceConditionChangeAspects;
};

export type SequenceLimit =
  | { maxCount: number; maxAge?: never }
  | { maxCount?: never; maxAge: { count: number; unit: DurationUnit } };

export interface DatapointSequenceSpec {
  sequenceId: string;
  datapointId: string;
  limit: SequenceLimit;
  condition: SequenceCondition;
}

export interface StatePartSpec {
  mapDatapoints?: DatapointMapping;
  calculateDatapoints?: Record<string, DatapointCalculationSpec>;
  sequenceDatapoints?: DatapointSequenceSpec[];
}

export const ControlActionTypes = {
  toggle: {
    description:
      'Toggles the value of the "target" datapoint between "true" and "false". Depends on the "source" datapoint.',
    paramKeys: {},
  },
  increase: {
    description:
      'Increases the value of the target datapoint by "params.increase" or 1 without parameter.',
    paramKeys: {
      source: '"target" or UniqueDatapoint',
      increase: { valueNum: 1 },
      target: {
        device: "<the target device id>",
        datapoint: "<the target datapoint id",
      },
    },
  },
};

export interface ControlActionValueParameter {
  valueNum?: number;
  valueString?: string;
}

export interface ControlAction {
  type: keyof typeof ControlActionTypes;
  params: {
    source: UniqueDatapoint | "target";
    target: DatapointTargetSpec;
  } & Record<string, ControlActionValueParameter>;
}

export interface ActionSpec {
  id: string;
  name: string;
  execution: ControlAction[];
}

export interface EngineSpec {
  id: string;
  autoStart?: boolean;
  collect?: DatacollectorSpec;
  controls?: ControlPartSpec[];
  actions?: Record<string, ActionSpec>;
  persistState?: StatePersistTargetSpec[];
  stateParts?: StatePartSpec[];
  persistControl?: ControlPersistTargetSpec[];
}

export interface MailingSMTPSpec {
  type: "smtp";
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface MariaDatabaseSpec {
  type: "maria-db";
  database: string;
  host: string;
  port: number;
  user: string;
  password: string;
}

export type PersistenceSpec = { isDefault?: boolean } & MariaDatabaseSpec;

export type MailingSpec = {
  isDefault?: boolean;
  defaultReceivers?: string[];
} & MailingSMTPSpec;

export interface SystemSpec {
  name?: string;
}

export interface Configuration {
  system?: SystemSpec;
  persistence: Record<string, PersistenceSpec>;
  mail: Record<string, MailingSpec>;
  devices: Record<string, Device>;
  engines: Record<string, EngineSpec>;
}

export interface CheckedConfiguration extends Configuration {
  isValid?: boolean;
}

export interface SystemStatus {
  startedAt: number;
  configuration: {
    content: CheckedConfiguration;
    errors: string[] | undefined;
    valid: CheckedConfiguration;
  };
}

export interface PreviewOptions {
  interval?: { from: DateTime; to: DateTime };
  precision?: Duration;
}

export interface DatastateContent {
  datapoints: Record<string, UniqueDatapoint>;
  datapointStates: Record<string, DatapointState>;
  sequences: Record<string, DatapointSequence>;
  sequenceStates: Record<string, SequenceState>;
}

export type DeviceId = string;

export type DatapointTargets = Record<DeviceId, DeviceControlRequest>;

export interface SerializableControlContext {
  engineId: string;
  datapointTargets: DatapointTargets;
  executedRequests: {
    deviceId: string;
    request: DeviceControlRequest;
    success: boolean;
    error?: string;
  }[];
}

export interface ControlstateContent {
  controls: Record<string, { context: SerializableControlContext }>;
}

export const Methods = {
  welcome: "Erste Message nach connect",
  ping: "Heartbeat",
  pong: "Heartbeat response",
  subscribe: "Subscribe to data topic (pub-sub)",
  publish: "Publish data for a topic (pub-sub)",
};

export type WsMethod = keyof typeof Methods;

export interface WsMessage {
  method: WsMethod;
  params?: Record<string, unknown>;
}

export const isWsMessage = (
  msg: unknown & { method?: unknown }
): msg is WsMessage => {
  return typeof msg === "object" && typeof msg.method === "string";
};

export const msg_welcome = (): WsMessage => ({ method: "welcome" });

export const msg_ping = (): WsMessage => ({ method: "ping" });

export const msg_pong = (): WsMessage => ({ method: "pong" });

export const msg_subscribe = (topic: string): WsMessage => {
  const method = "subscribe";
  return { method, params: { topic } };
};

export const msg_publish = (topic: string, data: unknown): WsMessage => {
  const method = "publish";
  return { method, params: { topic, data } };
};
