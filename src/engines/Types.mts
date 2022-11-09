import {
  EngineControlResponse,
  EngineSettings,
  EngineStatus,
  SerializableEngine,
} from "jm-castle-ac-dc-types/dist/All.mjs";
import { CastleAcDc } from "../system/status/System.mjs";
import { ControlContext } from "./ControlContext.mjs";
import { EngineContext } from "./EngineContext.mjs";

export interface Engine {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  status: () => Promise<EngineStatus>;
  settings: () => Promise<EngineSettings>;
  getSerializable: () => Promise<SerializableEngine>;
}

export interface Datacollector {
  onLapEnd: (consumer: EngineContextConsumer) => void;
}

export interface Datastate {
  onLapEnd: (consumer: EngineContextConsumer) => void;
}

export interface Control {
  onLapEnd: (consumer: ControlContextConsumer) => void;
  consumeAction: (
    actionId: string,
    context: EngineContext,
    system: CastleAcDc
  ) => Promise<EngineControlResponse>;
}

export interface EngineContextConsumer {
  onContextChange: (context: EngineContext) => Promise<void>;
}

export interface ControlContextConsumer {
  onControlContextChange: (context: ControlContext) => Promise<void>;
}

export const SystemEngineKey_datastate = "state";

export type SystemEngineKey = typeof SystemEngineKey_datastate;

export const isSystemEngineKey = (key: string): key is SystemEngineKey => {
  switch (key) {
    case SystemEngineKey_datastate:
      return true;
    default:
      return false;
  }
};
