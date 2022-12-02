import {
  ActionSpec,
  ControlAction,
  ControlPartSpec,
  UniqueDatapoint,
} from "jm-castle-ac-dc-types";
import { ControlContext } from "../../ControlContext.mjs";
import { ControlPartType } from "../../ControlPartTypes.mjs";
import { EngineContext } from "../../EngineContext.mjs";
import { ControlPart, ControlPartRunResponse } from "../Types.mjs";

export type ActionExecutionResult =
  | { success: true; error?: never }
  | { success: false; error: string };
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
    spec: ActionSpec,
    context: EngineContext,
    control: ControlContext
  ): Promise<ControlPartRunResponse> => {
    const { id, name, execution } = spec;
    const results: ActionExecutionResult[] = [];
    for (let i = 0; i < execution.length; i++) {
      const controlAction = execution[i];
      const { type } = controlAction;
      switch (type) {
        case "increase": {
          const result = await this.executeControlActionIncrease(
            i,
            controlAction,
            spec,
            context,
            control
          );
          results.push(result);
          break;
        }
        case "toggle": {
          const result = await this.executeControlActionToggle(
            i,
            controlAction,
            spec,
            context,
            control
          );
          results.push(result);
          break;
        }
        default:
          results.push({
            success: false,
            error: `Action (${id}:${name}): type "${type}": Not yet implemented`,
          });
      }
    }
    const allErrors: string[] = [];
    results.forEach((result) => result.error && allErrors.push(result.error));
    return allErrors.length
      ? {
          success: false,
          error: `Action (${id}, ${name}): ${allErrors.join(". ")}`,
        }
      : { success: true };
  };

  private executeControlActionIncrease = async (
    index: number,
    controlAction: ControlAction,
    spec: ActionSpec,
    context: EngineContext,
    control: ControlContext
  ): Promise<ControlPartRunResponse> => {
    const { params } = controlAction;
    const { source, target, increase, ifSourceUndefined } = params;
    const { valueNum: increaseValue } = increase || {};
    const { valueNum: sourceValueIfUndefined } = ifSourceUndefined || {};
    const sourceDatapointId =
      source === "target" ? `${target.datapoint}@${target.device}` : source.id;
    const { state: sourceState } =
      context.getDatapoint(sourceDatapointId) || {};
    if (!sourceState && typeof sourceValueIfUndefined !== "number") {
      return {
        success: false,
        error: `Action ${index} (type: increase): Source state is not available for id ${sourceDatapointId} and no fallback is defined ("ifSourceUndefined").`,
      };
    }
    const { valueNum: sourceStateValue } = sourceState || {};
    const sourceValue =
      typeof sourceStateValue === "number"
        ? sourceStateValue
        : sourceValueIfUndefined;
    control.setDatapointTarget(
      target,
      {
        id: target.datapoint,
        valueNum: sourceValue
          ? sourceValue + (increaseValue ? increaseValue : 1)
          : increaseValue
          ? increaseValue
          : 1,
        at: Date.now(),
      },
      "part-end"
    );
    return { success: true };
  };

  private executeControlActionToggle = async (
    index: number,
    controlAction: ControlAction,
    spec: ActionSpec,
    context: EngineContext,
    control: ControlContext
  ): Promise<ControlPartRunResponse> => {
    const { params } = controlAction;
    const { source, target, ifSourceUndefined } = params;
    const { valueNum: sourceValueIfUndefined } = ifSourceUndefined || {};
    const sourceDatapointId =
      source === "target" ? `${target.datapoint}@${target.device}` : source.id;
    const { state: sourceState } =
      context.getDatapoint(sourceDatapointId) || {};
    if (!sourceState && typeof sourceValueIfUndefined !== "number") {
      return {
        success: false,
        error: `Action ${index} (type: toggle): Source state is not available for id ${sourceDatapointId} and no fallback is defined ("ifSourceUndefined").`,
      };
    }
    const { valueNum: sourceStateValue } = sourceState || {};
    const sourceValue =
      typeof sourceStateValue === "number"
        ? sourceStateValue
        : sourceValueIfUndefined;
    control.setDatapointTarget(
      target,
      {
        id: target.datapoint,
        valueNum: sourceValue === 0 ? 1 : 0,
        valueString: sourceValue === 0 ? "true" : "false",
        at: Date.now(),
      },
      "part-end"
    );
    return { success: true };
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
