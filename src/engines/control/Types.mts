import { ActionSpec } from "jm-castle-ac-dc-types/dist/All.mjs";
import { ControlContext } from "../ControlContext.mjs";
import { EngineContext } from "../EngineContext.mjs";

export type ControlEvent = "lapEnd" | "historyChange";

export type ControlPartRunResponse =
  | {
      success: false;
      error: string;
    }
  | {
      success: true;
      error?: never;
    };

export interface ControlPart {
  run: (
    context: EngineContext,
    control: ControlContext
  ) => Promise<ControlPartRunResponse>;
  runForAction?: (
    action: ActionSpec,
    context: EngineContext,
    control: ControlContext
  ) => Promise<ControlPartRunResponse>;
}
