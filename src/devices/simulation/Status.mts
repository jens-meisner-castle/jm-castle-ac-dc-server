import { DateTime, Duration } from "luxon";
import {
  DatapointState,
  Device,
  DeviceDatapoint,
  DeviceStatus,
  DeviceTypeId,
  SimulationDeviceTypeId,
  SimulationPreviewResponse,
  UniqueDatapoint,
} from "../../Types.mjs";
import { getSimulationAtArray } from "../../utils/DateUtils.mjs";
import { DeviceInstance } from "../DeviceInstance.mjs";
import { SimulationDayAndNight } from "./day-night/Simulation.mjs";
import { SimulationByFile } from "./file/Simulation.mjs";
import { PreviewOptions, Simulation } from "./Types.mjs";
export const getUrl = (api: string) => {
  const url = new URL(api);
  const protocol = url.protocol;
  const searchParams = url.searchParams;
  const host = url.host;
  const path = url.pathname;
  return { protocol, searchParams, host, path };
};

const activeSimulations: Record<string, Simulation> = {};

export const stopSimulation = async (
  device: Device,
  deviceTypeId: DeviceTypeId
): Promise<void> => {
  switch (deviceTypeId) {
    case "sim-const":
    case "sim-seconds":
      return;
    case "sim-day-night":
    case "sim-file":
      delete activeSimulations[device.id];
      return;
    default:
      return;
  }
};

export const fetchStatusFromSimulation = async (
  device: Device,
  deviceTypeId: DeviceTypeId
): Promise<DeviceStatus> => {
  const datapoints: Record<string, DatapointState> = {};
  const responsive = true;
  const accessedAt = Date.now();
  const { api } = device;
  let error: string | undefined = undefined;
  switch (deviceTypeId) {
    case "sim-seconds":
      datapoints.seconds = {
        id: "seconds",
        at: accessedAt,
        valueNum: new Date(accessedAt).getSeconds(),
      };
      return { responsive, accessedAt, error, datapoints };
    case "sim-day-night":
      let simulation = activeSimulations[device.id];
      if (!simulation) {
        simulation = new SimulationDayAndNight(device);
        activeSimulations[device.id] = simulation;
        await simulation.start();
      }
      return simulation.fetchStatus();
    case "sim-const": {
      const { searchParams } = getUrl(api);
      searchParams.forEach((value, key) => {
        const { valueType } = device.datapoints
          ? device.datapoints[key]
          : { valueType: undefined };
        if (valueType === "number") {
          try {
            const valueNum = Number.parseFloat(value);
            datapoints[key] = {
              id: key,
              at: accessedAt,
              valueString: value,
              valueNum,
            };
          } catch (err) {
            error = err.toString();
          }
        } else {
          datapoints[key] = { id: key, at: accessedAt, valueString: value };
        }
      });
      return { responsive, accessedAt, error, datapoints };
    }
    case "sim-file": {
      let simulation = activeSimulations[device.id];
      if (!simulation) {
        simulation = new SimulationByFile(device);
        activeSimulations[device.id] = simulation;
        await simulation.start();
      }
      return simulation.fetchStatus();
    }
  }
};

export const getPreviewForSimulation = async (
  deviceInstance: DeviceInstance,
  options?: PreviewOptions
): Promise<SimulationPreviewResponse> => {
  const deviceType = deviceInstance.getDeviceType();
  const data: Record<string, DatapointState[]> = {};
  const { interval, precision } = options || {};
  if (!deviceType.simulation) {
    return {
      error: `This device (${deviceInstance.getDeviceId}, type: ${deviceType.id}) does not provide a simulation.`,
    };
  }
  const { dateLevel } = deviceType.simulation || {};
  const from = interval.from || DateTime.now().startOf(dateLevel || "day");
  const to = interval.to || DateTime.now().endOf(dateLevel || "day");
  const usedPrecision =
    precision ||
    (dateLevel === "year"
      ? Duration.fromObject({ hours: 24 })
      : Duration.fromObject({ minutes: 1 }));
  const atArr = getSimulationAtArray(from, to, usedPrecision);
  const { api } = deviceInstance.getDevice();
  let error: string | undefined = undefined;
  switch (deviceType.id) {
    case "sim-seconds": {
      const datapoint =
        deviceInstance.getPublicDatapointForPrivateLocalId("seconds");
      const datapoints: Record<string, DeviceDatapoint> = {};
      datapoints[datapoint.id] = datapoint;
      data[datapoint.id] = atArr.map((n) => ({
        id: datapoint.id,
        at: n,
        valueNum: new Date(n).getSeconds(),
      }));
      return { result: { datapoints, data } };
    }
    case "sim-const": {
      const { searchParams } = getUrl(api);
      const datapoints: Record<string, UniqueDatapoint> = {};
      searchParams.forEach((value, key) => {
        const datapoint: UniqueDatapoint =
          deviceInstance.getPublicDatapointForPrivateLocalId(key) || {
            id: key,
            name: "unknown",
            valueType: "string",
          };
        datapoints[datapoint.id] = datapoint;
        const { valueType } = datapoint;
        if (valueType === "number") {
          try {
            const valueNum = Number.parseFloat(value);
            data[key] = atArr.map((n) => ({ id: key, at: n, valueNum }));
          } catch (err) {
            error = err.toString();
          }
        } else {
          data[key] = atArr.map((n) => ({
            id: key,
            at: n,
            valueString: value,
          }));
        }
      });
      return error ? { error } : { result: { datapoints, data } };
    }
    case "sim-day-night": {
      const simulation = new SimulationDayAndNight(deviceInstance.getDevice());
      await simulation.start();
      const { data: previewData, error: localErr } =
        await simulation.getPreviewData(atArr);
      localErr && (error = localErr);
      await simulation.stop();
      const datapoints: Record<string, UniqueDatapoint> = {};
      Object.keys(previewData).forEach((k) => {
        const datapoint: UniqueDatapoint =
          deviceInstance.getPublicDatapointForPrivateLocalId(k);
        datapoint && (datapoints[datapoint.id] = datapoint);
        datapoint && (data[datapoint.id] = previewData[k]);
      });
      return error ? { error } : { result: { datapoints, data } };
    }
    case "sim-file": {
      const simulation = new SimulationByFile(deviceInstance.getDevice());
      await simulation.start();
      const { data: previewData, error: localErr } =
        await simulation.getPreviewData(atArr);
      localErr && (error = localErr);
      await simulation.stop();
      const datapoints: Record<string, UniqueDatapoint> = {};
      Object.keys(previewData).forEach((k) => {
        const datapoint: UniqueDatapoint =
          deviceInstance.getPublicDatapointForPrivateLocalId(k);
        datapoint && (datapoints[datapoint.id] = datapoint);
        datapoint && (data[datapoint.id] = previewData[k]);
      });
      return error ? { error } : { result: { datapoints, data } };
    }
  }
};
