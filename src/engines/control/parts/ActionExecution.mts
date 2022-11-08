import {
  ActionSpec,
  ControlPartSpec,
  UniqueDatapoint,
} from "../../../Types.mjs";
import { ControlContext } from "../../ControlContext.mjs";
import { ControlPartType } from "../../ControlPartTypes.mjs";
import { EngineContext } from "../../EngineContext.mjs";
import { ControlPart, ControlPartRunResponse } from "../Types.mjs";

export class ActionExecutionPart implements ControlPart {
  constructor(spec: ControlPartSpec) {
    this.spec = spec;
    return this;
  }

  private spec: ControlPartSpec;

  public run = async (
    context: EngineContext,
    control: ControlContext
  ): Promise<ControlPartRunResponse> => {
    return { success: true };
  };

  public runForAction = async (
    action: ActionSpec,
    context: EngineContext,
    control: ControlContext
  ): Promise<ControlPartRunResponse> => {
    return { success: false, error: "Not yet implemented" };
  };
}

const checkControlPartSpec = (
  spec: ControlPartSpec,
  actions: Record<string, ActionSpec> | undefined,
  controlDatapoints: { __global: Record<string, UniqueDatapoint> } & Record<
    string,
    Record<string, UniqueDatapoint>
  >
): { result: boolean; errors: string[] } => {
  const errors: string[] = [];
  return { result: true, errors };
};

export const ActionExecutionType: ControlPartType = {
  id: "sys-action",
  name: "Ausführung von Steuerungsaktionen",
  input: {},
  output: {},
  checkControlPartSpec,
  makeControlPart: (spec) => {
    const part = new ActionExecutionPart(spec);
    return part;
  },
};
