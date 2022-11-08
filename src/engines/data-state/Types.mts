import { EngineContext } from "../EngineContext.mjs";

export type DatastateEvent = "lapEnd";

export type DatastatePartRunResponse =
  | {
      success: false;
      error: string;
    }
  | { success: true; error?: never };

export interface DatastatePart {
  run: (context: EngineContext) => Promise<DatastatePartRunResponse>;
}
