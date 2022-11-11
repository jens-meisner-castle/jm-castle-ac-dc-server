import { Calculator, findReferences } from "jm-castle-ac-dc-calc";
import {
  Datapoint,
  DatapointState,
  DatapointValueType,
  DatapointValueUnit,
  SequenceState,
} from "jm-castle-ac-dc-types";
import { EngineContext } from "../../EngineContext.mjs";
import { DatastatePartRunResponse } from "../Types.mjs";

export interface DatapointCalculatorProps {
  datapointId: string;
  name: string;
  code: string;
  valueType: DatapointValueType;
  valueUnit?: DatapointValueUnit;
}
export class DatapointCalculator {
  constructor(props: DatapointCalculatorProps) {
    const { code, datapointId, valueType, valueUnit, name } = props;
    const calculatorSource = {
      getDatapoint: this.getDatapoint,
      getSequence: this.getSequence,
    };
    this.calculator = new Calculator({
      code,
      datapointId,
      name,
      valueType,
      valueUnit,
      source: calculatorSource,
    });
    this.datapointId = datapointId;
    this.calculatedDatapoint = {
      id: this.datapointId,
      name,
      valueType,
      valueUnit,
    };
    this.code = code;
    const references = findReferences(code);
    if (references.error) {
      console.error(
        `DatapointCalculator (${this.calculatedDatapoint.id}): Received error on searching for references:`,
        references.error
      );
    }
    this.references = { datapoints: {}, sequences: {} };
    references.datapoints.forEach(
      (id) => (this.references.datapoints[id] = null)
    );
    references.sequences.forEach(
      (id) => (this.references.sequences[id] = null)
    );
  }
  private datapointId: string;
  private calculatedDatapoint: Datapoint;
  private code: string;
  private calculator: Calculator;
  private references: {
    datapoints: Record<string, DatapointState | null>;
    sequences: Record<string, SequenceState | null>;
  };
  private currentSource: {
    context: EngineContext;
  };
  private getDatapoint = (id: string) =>
    this.currentSource.context.getDatapoint(id);
  private getSequence = (id: string) =>
    this.currentSource.context.getSequence(id);
  private checkShouldRecalculate = (context: EngineContext) => {
    const foundSequenceChange = !!Object.keys(this.references.sequences).find(
      (k) => {
        const previousState = this.references.sequences[k];
        const { state } = context.getSequence(k) || {};
        if (previousState) {
          return !state || previousState.at !== state.at;
        } else {
          return !!state;
        }
      }
    );
    if (foundSequenceChange) {
      return true;
    }
    const foundDatapointChange = !!Object.keys(this.references.datapoints).find(
      (k) => {
        const previousState = this.references.datapoints[k];
        const { state } = context.getDatapoint(k) || {};
        if (previousState) {
          return !state || previousState.at !== state.at;
        } else {
          return !!state;
        }
      }
    );
    return foundDatapointChange;
  };
  public run = async (
    context: EngineContext
  ): Promise<DatastatePartRunResponse> => {
    try {
      if (!this.checkShouldRecalculate(context)) {
        return { success: true };
      }
      this.currentSource = { context };
      const calculationResult = this.calculator.calculate();
      const { valueNum, valueString, error } = calculationResult;
      if (!error) {
        Object.keys(this.references.datapoints).forEach((k) => {
          const { state } = context.getDatapoint(k) || {};
          this.references.datapoints[k] = state || null;
        });
        Object.keys(this.references.sequences).forEach((k) => {
          const { state } = context.getSequence(k) || {};
          this.references.sequences[k] = state || null;
        });
        context.setDatapoint(this.calculatedDatapoint, {
          id: this.datapointId,
          at: Date.now(),
          valueNum,
          valueString,
        });
        return { success: true };
      } else {
        return {
          success: false,
          error,
        };
      }
    } catch (error) {
      console.error(
        `Catched following error in datapoint calculator. id: ${this.datapointId}, code: ${this.code}`
      );
      console.error(error);
      return { success: false, error: error.toString() };
    }
  };
}
