import fetch, { RequestInit } from "node-fetch";
import { DatapointState, DeviceStatus } from "../../Types.mjs";
import { DeviceInstance } from "../DeviceInstance.mjs";
import { Shelly1PMDatapointId, Shelly1PMStatus } from "./Types.mjs";

export const fetchStatusFromDevice = (deviceInstance: DeviceInstance) =>
  fetchStatus(deviceInstance.getDevice().api);

export const fetchStatus = async (baseUrl: string): Promise<DeviceStatus> => {
  const accessedAt = Date.now();
  try {
    const options: RequestInit = {
      method: "GET",
      redirect: "follow",
      referrerPolicy: "origin-when-cross-origin",
    };
    const url = `${baseUrl}/status`;
    const response = await fetch(url, options);
    const responseObj = await response.json();
    const shellyStatus = responseObj as Shelly1PMStatus;
    if (!shellyStatus || !Object.keys(shellyStatus).length) {
      const status: DeviceStatus = {
        error: "Received empty status from shelly1PM.",
        responsive: true,
        accessedAt,
        datapoints: {},
      };
      return status;
    }
    const power = getCurrentPower(shellyStatus);
    const innerTemperature = getInnerTemperature(shellyStatus);
    const externalTemperatures = getExternalTemperatures(shellyStatus);
    const externalTemperature1 = externalTemperatures["0"];
    const externalTemperature2 = externalTemperatures["1"];
    const externalTemperature3 = externalTemperatures["2"];
    const energyCounterTotal = getEnergyCounterTotal(shellyStatus);
    const energySumsPrevMinutes = getEnergySumsPreviousMinutes(shellyStatus);
    const energySumPrevMinute1 =
      energySumsPrevMinutes && energySumsPrevMinutes.length > 0
        ? energySumsPrevMinutes[0]
        : undefined;
    const energySumPrevMinute2 =
      energySumsPrevMinutes && energySumsPrevMinutes.length > 1
        ? energySumsPrevMinutes[1]
        : undefined;
    const energySumPrevMinute3 =
      energySumsPrevMinutes && energySumsPrevMinutes.length > 2
        ? energySumsPrevMinutes[2]
        : undefined;
    const isRelayOn = getIsRelayOn(shellyStatus);
    const datapoints: Partial<Record<Shelly1PMDatapointId, DatapointState>> = {
      power: { id: "power", valueNum: power, at: accessedAt },
      "inner-temperature": {
        id: "inner-temperature",
        valueNum: innerTemperature,
        at: accessedAt,
      },
      "energy-counter-total": {
        id: "energy-counter-total",
        valueNum: energyCounterTotal,
        at: accessedAt,
      },
      "relay-state": {
        id: "relay-state",
        valueNum: isRelayOn ? 1 : 0,
        valueString: isRelayOn ? "true" : "false",
        at: accessedAt,
      },
    };
    if (typeof energySumPrevMinute1 === "number") {
      datapoints["energy-sum-prev-minute-1"] = {
        id: "energy-sum-prev-minute-1",
        valueNum: energySumPrevMinute1,
        at: accessedAt,
      };
    }
    if (typeof energySumPrevMinute2 === "number") {
      datapoints["energy-sum-prev-minute-2"] = {
        id: "energy-sum-prev-minute-2",
        valueNum: energySumPrevMinute2,
        at: accessedAt,
      };
    }
    if (typeof energySumPrevMinute3 === "number") {
      datapoints["energy-sum-prev-minute-3"] = {
        id: "energy-sum-prev-minute-3",
        valueNum: energySumPrevMinute3,
        at: accessedAt,
      };
    }
    if (typeof externalTemperature1 === "number") {
      datapoints["external-temperature-1"] = {
        id: "external-temperature-1",
        valueNum: externalTemperature1,
        at: accessedAt,
      };
    }
    if (typeof externalTemperature2 === "number") {
      datapoints["external-temperature-2"] = {
        id: "external-temperature-2",
        valueNum: externalTemperature2,
        at: accessedAt,
      };
    }
    if (typeof externalTemperature3 === "number") {
      datapoints["external-temperature-3"] = {
        id: "external-temperature-3",
        valueNum: externalTemperature3,
        at: accessedAt,
      };
    }
    const status: DeviceStatus = { responsive: true, accessedAt, datapoints };
    return status;
  } catch (error) {
    const status: DeviceStatus = {
      error: error.toString(),
      responsive: false,
      accessedAt,
      datapoints: {},
    };
    return status;
  }
};

export const getIsRelayOn = (status: Shelly1PMStatus): boolean | undefined => {
  return status.relays?.length ? status.relays[0].ison : undefined;
};

export const getCurrentPower = (
  status: Shelly1PMStatus
): number | undefined => {
  return status.meters?.length ? status.meters[0].power : undefined;
};

export const getEnergyCounterTotal = (
  status: Shelly1PMStatus
): number | undefined => {
  return status.meters?.length ? status.meters[0].total : undefined;
};

export const getEnergySumsPreviousMinutes = (
  status: Shelly1PMStatus
): number[] | undefined => {
  return status.meters?.length ? status.meters[0].counters : undefined;
};

/**
 *
 * @param status source
 * @returns [min, avg, max]
 */
export const getPowerStatistics = (
  status: Shelly1PMStatus
): number[] | undefined => {
  return status.meters?.length ? status.meters[0].counters : undefined;
};

export const getInnerTemperature = (
  status: Shelly1PMStatus
): number | undefined => {
  return status.tmp.tC;
};

export const getExternalTemperatures = (
  status: Shelly1PMStatus
): Partial<Record<keyof typeof status.ext_temperature, number>> => {
  const record: Partial<Record<keyof typeof status.ext_temperature, number>> =
    {};
  Object.keys(status.ext_temperature).forEach(
    (k: keyof typeof status.ext_temperature) => {
      const temperature = status.ext_temperature[k].tC;
      if (typeof temperature === "number") {
        record[k] = temperature;
      }
    }
  );
  return record;
};
