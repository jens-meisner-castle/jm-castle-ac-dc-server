import { DateTime, Duration } from "luxon";
import {
  EngineControlResponse,
  DatapointState,
  DeviceStatus,
} from "../../Types.mjs";

export interface Simulation {
  start: () => Promise<EngineControlResponse>;
  fetchStatus: () => Promise<DeviceStatus>;
  getPreviewData: (
    atArr: number[]
  ) => Promise<{ data: Record<string, DatapointState[]>; error?: string }>;
}

export interface PreviewOptions {
  interval?: { from: DateTime; to: DateTime };
  precision?: Duration;
}
