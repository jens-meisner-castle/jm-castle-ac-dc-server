import {
  AnyDataValue,
  Datapoint,
  DatapointSequence,
  DatapointState,
  DatapointValueType,
  DatapointValueUnit,
  DurationUnit,
  DurationUnits,
  isDurationUnit,
  SequenceState,
} from "jm-castle-ac-dc-types";
import { DateTime, Duration } from "luxon";
import math, { all, create, isResultSet, Matrix } from "mathjs";
import { EngineContext } from "../../EngineContext.mjs";
import { DatastatePartRunResponse } from "../Types.mjs";

export const isDefined = (...values: unknown[]) =>
  values.every(
    (v) =>
      v !== null &&
      v !== undefined &&
      (typeof v !== "number" || !Number.isNaN(v))
  );

const getSequenceDuration = (
  sequence: DatapointSequence,
  state: SequenceState,
  unit: DurationUnit
) => {
  const { data } = state;
  const first = data.length ? data[0] : undefined;
  const last = data.length ? data[data.length - 1] : undefined;
  if (!first || !last) {
    return 0;
  }
  const { luxonKey } = DurationUnits[unit];
  return Duration.fromMillis(last.at - first.at).as(luxonKey);
};
const findInSequence = (
  which: "first" | "last",
  sequence: DatapointSequence,
  state: SequenceState,
  callback: (state: DatapointState) => boolean
) => {
  const { data } = state;
  if (which === "first") {
    return data.find(callback);
  } else {
    for (let i = data.length - 1; i >= 0; i--) {
      if (callback(data[i])) {
        return data[i];
      }
    }
    return undefined;
  }
};
const getSequenceFind = (
  which: "first" | "last",
  sequence: DatapointSequence,
  state: SequenceState,
  value: string | number,
  aspect: "at" | "value"
) => {
  const { data } = state;
  const found =
    typeof value === "string"
      ? findInSequence(which, sequence, state, (s) => s.valueString === value)
      : findInSequence(which, sequence, state, (s) => s.valueNum === value);
  if (!found) {
    return undefined;
  }
  return aspect === "at"
    ? found.at
    : typeof value === "string"
    ? found.valueString
    : found.valueNum;
};
const getSequenceIntegral = (
  sequence: DatapointSequence,
  state: SequenceState,
  unit: DurationUnit
) => {
  const { data } = state;
  if (data.length < 2) {
    return 0;
  }
  let sum = 0;
  for (let i = 1; i < data.length - 1; i++) {
    const previous = data[i - 1];
    const current = data[i];
    const y = (current.valueNum + previous.valueNum) / 2;
    const dx = current.at - previous.at;
    sum = sum + dx * y;
  }
  return Duration.fromMillis(sum).as(DurationUnits[unit].luxonKey);
};

const getValueForRange = (
  value: number,
  rawLimits: number[],
  values: AnyDataValue[],
  ifNone: AnyDataValue
) => {
  if (rawLimits.length !== values.length) {
    throw new Error(
      `Limits and values must have the same length. limits: ${rawLimits}, values: ${values}`
    );
  }
  if (!value) {
    return ifNone;
  }
  const index = [...rawLimits]
    .sort((a, b) => a - b)
    .reverse()
    .findIndex((limit) => {
      return value >= limit;
    });
  const result = index > -1 ? values.reverse()[index] : ifNone;
  return result;
};

const getValueForMathJsRange = (
  value: number,
  limits: Matrix,
  values: Matrix,
  ifNone: AnyDataValue
) => {
  if (limits.size()[0] !== values.size()[0]) {
    throw new Error(
      `Limits and values must have the same length. limits: ${limits}, values: ${values}`
    );
  }
  if (!value) {
    return ifNone;
  }
  const size = limits.size()[0];
  const rawLimits: number[] = [];
  for (let i = 0; i < size; i++) {
    rawLimits.push(limits.get([i]));
  }
  const rawValues: AnyDataValue[] = [];
  for (let i = 0; i < size; i++) {
    rawValues.push(values.get([i]));
  }
  return getValueForRange(value, rawLimits, rawValues, ifNone);
};

export const extendMath = (imports: Record<string, unknown>) => {
  const importOptions: math.ImportOptions = {};
  const configOptions: math.ConfigOptions = {};
  const math = create(all, configOptions);
  math.import && math.import(imports, importOptions);
  return math;
};

export const findReferences = (
  code: string
): {
  datapoints: Record<string, null>;
  sequences: Record<string, null>;
  error?: string;
} => {
  const refs: {
    datapoints: Record<string, null>;
    sequences: Record<string, null>;
  } = { datapoints: {}, sequences: {} };
  const getValue = (key: string): number | string | undefined => {
    refs.datapoints[key] = null;
    return 1;
  };
  const seqDuration = (sequenceId: string, resultUnit: string) => {
    refs.sequences[sequenceId] = null;
    return 1;
  };
  const seqFind = (
    which: string,
    sequenceId: string,
    value: number | string,
    aspect: string
  ): string | number | undefined => {
    refs.sequences[sequenceId] = null;
    return undefined;
  };
  const seqIntegral = (sequenceId: string, timeUnit: string) => {
    refs.sequences[sequenceId] = null;
    return 1;
  };

  const math = extendMath({
    isDef: function (...value: unknown[]) {
      return isDefined(...value);
    },
    get: function (key: string) {
      return getValue(key);
    },
    seqDuration: function (sequenceId: string, valueUnit: string) {
      return seqDuration(sequenceId, valueUnit);
    },
    seqFind: function (
      which: string,
      sequenceId: string,
      value: string | number,
      aspect: string
    ) {
      return seqFind(which, sequenceId, value, aspect);
    },
    seqIntegral: function (sequenceId: string, timeUnit: string) {
      return seqIntegral(sequenceId, timeUnit);
    },
    valueForRange: function (
      value: number,
      limits: Matrix,
      values: Matrix,
      ifNone: AnyDataValue
    ) {
      return getValueForMathJsRange(value, limits, values, ifNone);
    },
  });
  if (!math.compile) {
    throw new Error(
      `Fatal error (math.compile is undefined): Unable to find references in DatapointCalculator.`
    );
  }
  const evalFunction = math.compile(code);
  try {
    evalFunction.evaluate({ tmp: {} });
    return refs;
  } catch (error) {
    return { datapoints: {}, sequences: {}, error: error.toString() };
  }
};

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
    this.datapointId = datapointId;
    this.calculatedDatapoint = {
      id: this.datapointId,
      name,
      valueType,
      valueUnit,
    };
    this.code = code;
    const getValue = (key: string) => {
      const { point, state } =
        this.currentSource.context.getDatapoint(key) || {};
      return state
        ? point.valueType === "string"
          ? state.valueString
          : state.valueNum
        : undefined;
    };
    const seqDuration = (sequenceId: string, resultUnit: string) => {
      if (!isDurationUnit(resultUnit)) {
        throw new Error(
          `The function seqDuration needs a duration unit as second param: Use one of: ${Object.keys(
            DurationUnits
          ).join(", ")}`
        );
      }
      const { sequence, state } =
        this.currentSource.context.getSequence(sequenceId) || {};
      if (!sequence) {
        throw new Error(
          `The sequence with id ${sequenceId} is not available in the context.`
        );
      }
      return getSequenceDuration(sequence, state, resultUnit);
    };
    const seqFind = (
      which: string,
      sequenceId: string,
      value: number | string,
      aspect: string
    ) => {
      if (which !== "first" && which !== "last") {
        throw new Error(
          `The function seqFind needs a selector as first param. Use one of: "first", "last".`
        );
      }
      if (aspect !== "at" && aspect !== "value") {
        throw new Error(
          `The function seqFind needs an aspect as third param. Use one of: "at", "value".`
        );
      }
      const { sequence, state } =
        this.currentSource.context.getSequence(sequenceId) || {};
      if (!sequence) {
        throw new Error(
          `The sequence with id ${sequenceId} is not available in the context.`
        );
      }
      return getSequenceFind(which, sequence, state, value, aspect);
    };
    const seqIntegral = (sequenceId: string, timeUnit: string) => {
      if (!isDurationUnit(timeUnit)) {
        throw new Error(
          `The function seqIntegral needs a duration unit as second param: Use one of: ${Object.keys(
            DurationUnits
          ).join(", ")}`
        );
      }
      const { sequence, state } =
        this.currentSource.context.getSequence(sequenceId) || {};
      if (!sequence) {
        throw new Error(
          `The sequence with id ${sequenceId} is not available in the context.`
        );
      }
      const { point } = sequence;
      if (point.valueType === "string") {
        throw new Error(
          `The seqIntegral function can not be computed on string values (sequence id: ${sequenceId}). Choose a different sequence.`
        );
      }
      return getSequenceIntegral(sequence, state, timeUnit);
    };

    const math = extendMath({
      isDef: function (...value: unknown[]) {
        return isDefined(...value);
      },
      get: function (key: string) {
        return getValue(key);
      },
      seqDuration: function (sequenceId: string, valueUnit: string) {
        return seqDuration(sequenceId, valueUnit);
      },
      seqFind: function (
        which: string,
        sequenceId: string,
        value: string | number,
        aspect: string
      ) {
        return seqFind(which, sequenceId, value, aspect);
      },
      seqIntegral: function (sequenceId: string, timeUnit: string) {
        return seqIntegral(sequenceId, timeUnit);
      },
      valueForRange: function (
        value: number,
        limits: Matrix,
        values: Matrix,
        ifNone: AnyDataValue
      ) {
        return getValueForMathJsRange(value, limits, values, ifNone);
      },
    });
    if (!math.compile) {
      throw new Error(
        `Fatal error (math.compile is undefined): Unable to create DatapointCalculator.`
      );
    }
    this.evalFunction = math.compile(code);
    const references = findReferences(code);
    if (references.error) {
      console.error(
        `DatapointCalculator (${this.calculatedDatapoint.id}): Received error on searching for references:`,
        references.error
      );
    }
    this.references = references;
  }
  private datapointId: string;
  private calculatedDatapoint: Datapoint;
  private code: string;
  private references: {
    datapoints: Record<string, DatapointState | null>;
    sequences: Record<string, SequenceState | null>;
  };
  private currentSource: {
    context: EngineContext;
    tmp: Record<string, unknown>;
  };
  private evalFunction: math.EvalFunction;
  private getStateValueFor = (
    calculated: unknown
  ): { valueNum?: number; valueString?: string; error?: string } => {
    if (!isDefined(calculated)) {
      return {};
    }
    if (this.calculatedDatapoint.valueType === "number") {
      return typeof calculated === "number"
        ? { valueNum: calculated }
        : {
            error: `The specified value type is ${
              this.calculatedDatapoint.valueType
            }, but the type of the calculated result is ${typeof calculated}.`,
          };
    } else if (this.calculatedDatapoint.valueType === "string") {
      return typeof calculated === "string"
        ? { valueString: calculated }
        : {
            error: `The specified value type is ${
              this.calculatedDatapoint.valueType
            }, but the type of the calculated result is ${typeof calculated}.`,
          };
    } else if (this.calculatedDatapoint.valueType === "boolean") {
      if (typeof calculated === "string") {
        return {
          valueString: calculated,
          valueNum: calculated === "true" ? 1 : 0,
        };
      } else if (typeof calculated === "number") {
        return {
          valueString: calculated === 1 ? "true" : "false",
          valueNum: calculated,
        };
      } else if (typeof calculated === "boolean") {
        return {
          valueString: calculated === true ? "true" : "false",
          valueNum: calculated === true ? 1 : 0,
        };
      } else {
        return {
          error: `The specified value type is ${
            this.calculatedDatapoint.valueType
          }, but the type of the calculated result is ${typeof calculated}.`,
        };
      }
    } else if (this.calculatedDatapoint.valueType === "date") {
      return typeof calculated === "number"
        ? {
            valueNum: calculated,
            valueString: DateTime.fromMillis(calculated).toFormat(
              "yyyy-LL-dd HH:mm:ss"
            ),
          }
        : {
            error: `The specified value type is ${
              this.calculatedDatapoint.valueType
            }, but the type of the calculated result is ${typeof calculated}.`,
          };
    }
  };

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
      this.currentSource = { tmp: {}, context };
      const anyResult = this.evalFunction.evaluate(this.currentSource);
      let result: AnyDataValue = undefined;
      if (isResultSet(anyResult)) {
        try {
          const resultArr: AnyDataValue[] = anyResult.valueOf();
          result = resultArr.length
            ? resultArr[resultArr.length - 1]
            : undefined;
        } catch (error) {
          console.error(`Unexpected result of evaluating math node: ${result}`);
        }
      } else {
        result = anyResult;
      }

      const { valueNum, valueString, error } = this.getStateValueFor(result);
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
          error: `Bad result for datapoint calculation (id: ${
            this.datapointId
          }): Result type should be ${
            this.calculatedDatapoint.valueType
          } but it is ${typeof result}. Code: ${this.code}`,
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
