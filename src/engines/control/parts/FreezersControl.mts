import {
  ActionSpec,
  ControlExecutionSpec,
  ControlPartSpec,
  Datapoint,
  DatapointState,
  DatapointTargetSpec,
  UniqueDatapoint,
} from "jm-castle-ac-dc-types/dist/All.mjs";
import { ControlContext } from "../../ControlContext.mjs";
import { ControlPartType } from "../../ControlPartTypes.mjs";
import { EngineContext } from "../../EngineContext.mjs";
import { ControlPart, ControlPartRunResponse } from "../Types.mjs";

export class FreezersControlPart implements ControlPart {
  constructor(spec: ControlPartSpec) {
    this.spec = spec;
    this.powerAvailableId = spec.input["power-available"];
    this.freezer1RelayId = spec.input["relay-freezer-01"];
    this.freezer2RelayId = spec.input["relay-freezer-02"];
    this.freezer1OnId = spec.input["on-off-freezer-01"];
    this.freezer2OnId = spec.input["on-off-freezer-02"];
    this.controlFreezer1Target = spec.output["relay-freezer-01"];
    this.controlFreezer2Target = spec.output["relay-freezer-02"];
    return this;
  }

  private spec: ControlPartSpec;
  private powerAvailableId: string;
  private freezer1RelayId: string;
  private freezer2RelayId: string;
  private freezer1OnId: string;
  private freezer2OnId: string;
  private controlFreezer1Target: DatapointTargetSpec & ControlExecutionSpec;
  private controlFreezer2Target: DatapointTargetSpec & ControlExecutionSpec;
  private references: {
    datapoints: {
      stateActive1: DatapointState | null;
      stateActive2: DatapointState | null;
      stateRelay1: DatapointState | null;
      stateRelay2: DatapointState | null;
      statePowerAvailable: DatapointState | null;
    };
  } = {
    datapoints: {
      statePowerAvailable: null,
      stateActive1: null,
      stateActive2: null,
      stateRelay1: null,
      stateRelay2: null,
    },
  };

  private checkForNews = (currentStates: {
    statePowerAvailable: DatapointState;
    stateActive1: DatapointState;
    stateActive2: DatapointState;
    stateRelay1: DatapointState;
    stateRelay2: DatapointState;
  }) => {
    return !!Object.keys(currentStates).find(
      (k: keyof typeof currentStates) => {
        const current = currentStates[k];
        const previous = this.references.datapoints[k];
        return !previous || previous.at !== current.at;
      }
    );
  };

  public run = async (
    context: EngineContext,
    control: ControlContext
  ): Promise<ControlPartRunResponse> => {
    try {
      const { state: statePowerAvailable } =
        context.getDatapoint(this.powerAvailableId) || {};
      const { state: stateActive1 } =
        context.getDatapoint(this.freezer1OnId) || {};
      const { state: stateActive2 } =
        context.getDatapoint(this.freezer2OnId) || {};
      const { state: stateRelay1 } =
        context.getDatapoint(this.freezer1RelayId) || {};
      const { state: stateRelay2 } =
        context.getDatapoint(this.freezer2RelayId) || {};
      if (
        !statePowerAvailable ||
        !stateActive1 ||
        !stateActive2 ||
        !stateRelay1 ||
        !stateRelay2
      ) {
        throw new Error(
          `Bad state in engine context for control part ${
            this.spec.type
          }. Missing input: ${JSON.stringify({
            stateActive1,
            stateActive2,
            stateRelay1,
            stateRelay2,
            statePowerAvailable,
          })}`
        );
      }
      if (
        this.checkForNews({
          stateActive1,
          stateActive2,
          stateRelay1,
          stateRelay2,
          statePowerAvailable,
        })
      ) {
        this.references.datapoints.stateActive1 = stateActive1;
        this.references.datapoints.stateActive2 = stateActive2;
        this.references.datapoints.stateRelay1 = stateRelay1;
        this.references.datapoints.stateRelay2 = stateRelay2;
        this.references.datapoints.statePowerAvailable = statePowerAvailable;
        if (stateActive1.valueNum === 1) {
          // Kühlung 1 ist aktiv (=kühlt)
          if (stateActive2.valueNum === 0 && stateRelay2.valueNum === 1) {
            // Kühlung2 ist nicht aktiv und Relay 2 ist an => Relay 2 ausschalten
            const { when } = this.controlFreezer2Target;
            control.setDatapointTarget(
              this.controlFreezer2Target,
              {
                id: this.controlFreezer2Target.datapoint,
                valueNum: 0,
                valueString: "false",
                at: Date.now(),
              },
              when
            );
          }
        } else {
          // Kühlung 1 ist nicht aktiv
          if (stateRelay2.valueNum === 0) {
            // Relay 2 ist aus => Relay 2 anschalten
            const { when } = this.controlFreezer2Target;
            control.setDatapointTarget(
              this.controlFreezer2Target,
              {
                id: this.controlFreezer2Target.datapoint,
                valueNum: 1,
                valueString: "true",
                at: Date.now(),
              },
              when
            );
          }
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };
}

export type InputDatapointId =
  | "power-available"
  | "relay-freezer-01"
  | "relay-freezer-02"
  | "on-off-freezer-01"
  | "on-off-freezer-02";

export type OutputDatapointId = "relay-freezer-01" | "relay-freezer-02";

export const inDatapoints = (): Partial<
  Record<InputDatapointId, Datapoint>
> => ({
  "power-available": {
    id: "power-available",
    name: "Verfügbare Leistung",
    valueType: "number",
    valueUnit: "W",
  },
  "relay-freezer-01": {
    id: "relay-freezer-01",
    name: "Status Kühlung 1",
    valueType: "boolean",
  },
  "relay-freezer-02": {
    id: "relay-freezer-02",
    name: "Status Kühlung 2",
    valueType: "boolean",
  },
  "on-off-freezer-01": {
    id: "on-off-freezer-01",
    name: "Status Kühlung 1",
    valueType: "boolean",
  },
  "on-off-freezer-02": {
    id: "on-off-freezer-02",
    name: "Status Kühlung 2",
    valueType: "boolean",
  },
});

export const outDatapoints = (): Partial<
  Record<OutputDatapointId, Datapoint>
> => ({
  "relay-freezer-01": {
    id: "relay-freezer-01",
    name: "Status Kühlung 1",
    valueType: "boolean",
  },
  "relay-freezer-02": {
    id: "relay-freezer-02",
    name: "Status Kühlung 2",
    valueType: "boolean",
  },
});

const checkControlPartSpec = (
  spec: ControlPartSpec,
  actions: Record<string, ActionSpec> | undefined,
  controlDatapoints: { __global: Record<string, UniqueDatapoint> } & Record<
    string,
    Record<string, UniqueDatapoint>
  >
): { result: boolean; errors: string[] } => {
  const { input, output } = spec;
  const errors: string[] = [];
  const neededInput = inDatapoints();
  const neededOutput = outDatapoints();
  const badInputKey = Object.keys(neededInput).find((k) => {
    if (input[k]) {
      // check also valueType
      return false;
    } else {
      errors.push(`Missing input datapoint ${k}.`);
      return true;
    }
  });
  if (badInputKey) {
    return { result: false, errors };
  }
  const badOutputKey = Object.entries(neededOutput).find(
    ([k, neededDatapoint]) => {
      const { device, datapoint: datapointId } = output[k] || {};
      if (datapointId) {
        const datapoint =
          (device && controlDatapoints[device]
            ? controlDatapoints[device][datapointId]
            : undefined) || controlDatapoints.__global[datapointId];
        if (datapoint) {
          if (neededDatapoint.valueType !== datapoint.valueType) {
            errors.push(
              `Bad output datapoint ${k}: The assigned datapoint id ${datapointId}${
                device ? " for device " + device : ""
              } has a different value type. The value type must be ${
                neededDatapoint.valueType
              }`
            );
            return true;
          }
          if (
            neededDatapoint.valueUnit &&
            neededDatapoint.valueUnit !== datapoint.valueUnit
          ) {
            errors.push(
              `Bad output datapoint ${k}: The assigned datapoint id ${datapointId}${
                device ? " for device " + device : ""
              } has a different value unit. The value unit must be ${
                neededDatapoint.valueUnit
              }`
            );
            return true;
          }
          return false;
        } else {
          errors.push(
            `Bad output datapoint ${k}: The assigned datapoint id ${datapointId}${
              device ? " for device " + device : ""
            } is not available as control datapoint.`
          );
          return true;
        }
      } else {
        errors.push(`Missing output datapoint ${k}.`);
        return true;
      }
    }
  );
  if (badOutputKey) {
    return { result: false, errors };
  }
  return { result: true, errors };
};

export const FreezersControlType: ControlPartType = {
  id: "sys-freezers-control",
  name: "Sequenzierung von Kühlungen",
  input: inDatapoints(),
  output: outDatapoints(),
  checkControlPartSpec,
  makeControlPart: (spec) => {
    const part = new FreezersControlPart(spec);
    return part;
  },
};
