import {
  ActionSpec,
  ControlAction,
  ControlPartSpec,
  ControlPartTypeId,
  Datapoint,
  UniqueDatapoint,
} from "../Types.mjs";
import { ActionExecutionType } from "./control/parts/ActionExecution.mjs";
import { FreezersControlType } from "./control/parts/FreezersControl.mjs";
import { ControlPart } from "./control/Types.mjs";

export type ControlPartType = {
  id: ControlPartTypeId;
  name: string;
  description?: string;
  examples?: ControlPartSpec[];
  input: Record<string, Datapoint>;
  output: Record<string, Datapoint>;
  makeControlPart?: (spec: ControlPartSpec) => ControlPart;
  checkControlPartSpec: (
    spec: ControlPartSpec,
    actions: Record<string, ActionSpec> | undefined,
    controlDatapoints: { __global: Record<string, UniqueDatapoint> } & Record<
      string,
      Record<string, UniqueDatapoint>
    >
  ) => {
    result: boolean;
    errors: string[];
  };
};

const allControlParts: Record<ControlPartTypeId, ControlPartType> = {
  "sys-freezers-control": FreezersControlType,
  "sys-action": ActionExecutionType,
};

export const supportedControlPartTypes = allControlParts;
