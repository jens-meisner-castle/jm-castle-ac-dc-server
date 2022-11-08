import { ControlContext } from "../ControlContext.mjs";
import { EngineContext } from "../EngineContext.mjs";

export type PersistPartRunResponse =
  | {
      success: false;
      error: string;
    }
  | { success: true; error?: never };

export interface PersistPart<T = EngineContext | ControlContext> {
  run: (context: T) => Promise<PersistPartRunResponse>;
}
