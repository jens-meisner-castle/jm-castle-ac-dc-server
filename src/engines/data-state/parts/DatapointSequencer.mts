import {
  DatapointSequenceSpec,
  DatapointState,
  DurationUnits,
  UniqueDatapoint,
} from "jm-castle-ac-dc-types/dist/All.mjs";
import { Duration, DurationLikeObject } from "luxon";
import { EngineContext } from "../../EngineContext.mjs";
import { DatastatePart, DatastatePartRunResponse } from "../Types.mjs";

export class DatapointSequencer implements DatastatePart {
  constructor(spec: DatapointSequenceSpec) {
    this.spec = spec;
    return this;
  }

  private spec: DatapointSequenceSpec;
  private sequenceData: DatapointState[] = [];

  private checkLimit = () => {
    if (!this.sequenceData.length) {
      return;
    }
    const { maxCount, maxAge } = this.spec.limit;
    if (this.sequenceData.length > maxCount) {
      this.sequenceData = this.sequenceData.slice(-maxCount);
    }
    if (maxAge) {
      const luxonKey = DurationUnits[maxAge.unit].luxonKey;
      const nowMs = Date.now();
      const obj: DurationLikeObject = {};
      obj[luxonKey] = maxAge.count;
      const maxMsDiff = Duration.fromObject(obj).as("milliseconds");
      if (nowMs - this.sequenceData[0].at > maxMsDiff) {
        // only if the oldest is too old
        const indexYoungEnough = this.sequenceData.findIndex(
          (s) => nowMs - s.at <= maxMsDiff
        );
        if (indexYoungEnough > 0) {
          this.sequenceData = this.sequenceData.slice(indexYoungEnough);
        } else {
          // all too old...??, but possible
          this.sequenceData = [];
        }
      }
    }
  };

  private checkCondition = (
    datapoint: UniqueDatapoint,
    latestState: DatapointState,
    newState: DatapointState
  ) => {
    const { condition } = this.spec;
    if (!condition) {
      return true;
    }
    const { change } = condition;
    if (change === "value") {
      switch (datapoint.valueType) {
        case "number":
        case "boolean":
        case "date":
          return latestState.valueNum !== newState.valueNum;
        case "string":
          return latestState.valueString !== newState.valueString;
        default:
          return true;
      }
    }
    if (change === "at") {
      return latestState.at !== newState.at;
    }
  };

  public run = async (
    context: EngineContext
  ): Promise<DatastatePartRunResponse> => {
    try {
      const { datapointId, sequenceId } = this.spec;
      const { state, point } = context.getDatapoint(datapointId) || {};
      if (state && point) {
        const latestInSequence =
          this.sequenceData.length > 0
            ? this.sequenceData[this.sequenceData.length - 1]
            : undefined;
        if (
          !latestInSequence ||
          this.checkCondition(point, latestInSequence, state)
        ) {
          this.sequenceData.push(state);
          this.checkLimit();
          context.setSequence(
            { id: sequenceId, point },
            { id: sequenceId, at: Date.now(), data: this.sequenceData }
          );
        }
        return { success: true };
      } else {
        return {
          success: false,
          error: `Bad sequence specification ${sequenceId}: The specified datapoint ${datapointId} is not available in the context.`,
        };
      }
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };
}
