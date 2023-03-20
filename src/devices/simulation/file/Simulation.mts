import {
  DatapointState,
  Device,
  DeviceStatus,
  EngineControlResponse,
} from "jm-castle-ac-dc-types";
import { getDateFormat } from "jm-castle-types/build";
import { DateTime } from "luxon";
import { readJsonFile } from "../../../configuration/Configuration.mjs";
import { getUrl } from "../Status.mjs";
import { Simulation } from "../Types.mjs";

export interface SimulationValue {
  at: string;
  valueNum?: number;
  valueString?: string;
}
interface PreparedSimulationValueNum {
  at: number;
  valueNum: number;
}

export type ValueCourse = "steps" | "linear";

export interface SimulationFile {
  timeline: {
    datapointId: string;
    per: "day";
    values: SimulationValue[];
    course: ValueCourse;
  };
}

const emptyDeviceStatus: DeviceStatus = {
  accessedAt: 0,
  responsive: false,
  datapoints: {},
};

function findValueAndIndex<T>(
  arr: T[],
  cb: (value: T) => boolean
): { value?: T; index: number } {
  let index = -1;
  let result: { value?: T; index: number } = { index: -1 };
  arr.find((value) => {
    index = index + 1;
    if (cb(value)) {
      result = { value, index };
      return true;
    }
    return false;
  });
  return result;
}

const luxonFormat = getDateFormat("second");

const startOf20221111 = DateTime.fromFormat("2022-11-11 00:00:00", luxonFormat);

export class SimulationByFile implements Simulation {
  constructor(device: Device) {
    this.device = device;
  }

  private device: Device;
  private datapointId: string;
  private simulationFile: SimulationFile;
  private sortedValues: PreparedSimulationValueNum[];
  private valueCourse: ValueCourse;
  private lastStatus: DeviceStatus;

  public start = async (): Promise<EngineControlResponse> => {
    try {
      const { api } = this.device;
      const { searchParams } = getUrl(api);
      const file = searchParams.get("file");
      const simulationFile = readJsonFile<SimulationFile>(file);
      this.simulationFile = simulationFile;
      const { values, course, datapointId } = simulationFile.timeline;
      this.valueCourse = course || "steps";
      this.datapointId = datapointId;
      const prepared: PreparedSimulationValueNum[] = [];

      values.forEach((v) => {
        if (typeof v.valueNum === "number") {
          const dt = DateTime.fromFormat(`2022-11-11 ${v.at}:00`, luxonFormat);
          const at = dt.diff(startOf20221111).as("milliseconds");
          prepared.push({ at, valueNum: v.valueNum });
        }
      });
      this.sortedValues = prepared.sort((a, b) => a.at - b.at).reverse();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };

  public stop = async (): Promise<EngineControlResponse> => {
    return { success: true };
  };

  private getValueForLinearCourse = (
    v1: PreparedSimulationValueNum,
    v2: PreparedSimulationValueNum,
    at: number
  ) => {
    // res = a * x + b
    const valueDiff = v2.valueNum - v1.valueNum;
    const timeDiff = v2.at - v1.at;
    if (valueDiff === 0 || timeDiff === 0) {
      return v1.valueNum;
    }
    const a = (v2.valueNum - v1.valueNum) / (v2.at - v1.at);
    const b = v1.at === 0 ? v1.valueNum : v1.valueNum - a * v1.at;
    return a * at + b;
  };

  private getValueAt = (at: number) => {
    switch (this.valueCourse) {
      case "steps":
        return this.sortedValues.find((v) => v.at <= at);
      case "linear": {
        const { value, index } = findValueAndIndex(
          this.sortedValues,
          (v) => v.at <= at
        );
        const v2 =
          index === 0
            ? this.sortedValues[this.sortedValues.length - 1]
            : this.sortedValues[index - 1];
        const valueNum = this.getValueForLinearCourse(value, v2, at);
        return { valueNum };
      }
      default:
        undefined;
    }
  };

  public fetchStatus = async (at?: number): Promise<DeviceStatus> => {
    const accessedAt = at || Date.now();
    try {
      const dt = DateTime.fromMillis(accessedAt);
      const timeAsMs = dt.diff(dt.startOf("day")).as("milliseconds");
      const newStatus = {
        ...(this.lastStatus || emptyDeviceStatus),
        accessedAt,
      };
      const value = this.getValueAt(timeAsMs);
      value &&
        (newStatus.datapoints[this.datapointId] = {
          id: this.datapointId,
          at: accessedAt,
          valueNum: value.valueNum,
        });
      newStatus.responsive = true;
      newStatus.error && delete newStatus.error;
      this.lastStatus = newStatus;
      return newStatus;
    } catch (error) {
      return {
        responsive: false,
        accessedAt,
        error: error.toString(),
        datapoints: {},
      };
    }
  };

  public getPreviewData = async (
    atArr: number[]
  ): Promise<{
    data: Record<string, DatapointState[]>;
    error?: string;
  }> => {
    try {
      const data: Record<string, DatapointState[]> = {};
      data[this.datapointId] = [];
      atArr.forEach((n) => {
        const dt = DateTime.fromMillis(n);
        const timeAsMs = dt.diff(dt.startOf("day")).as("milliseconds");
        const value = this.getValueAt(timeAsMs);
        data[this.datapointId].push({
          id: this.datapointId,
          valueNum: value.valueNum,
          at: n,
        });
      });
      return { data };
    } catch (error) {
      return {
        error: error.toString(),
        data: {},
      };
    }
  };
}
