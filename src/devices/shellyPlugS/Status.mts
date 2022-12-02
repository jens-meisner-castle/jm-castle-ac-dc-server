import { DatapointState, DeviceStatus } from "jm-castle-ac-dc-types";
import fetch, { RequestInit } from "node-fetch";
import { DeviceInstance } from "../DeviceInstance.mjs";
import { ShellyPlugSDatapointId, ShellyPlugSStatus } from "./Types.mjs";

export const fetchStatusFromDevice = async (
  deviceInstance: DeviceInstance
): Promise<DeviceStatus> => {
  const accessedAt = Date.now();
  try {
    const options: RequestInit = {
      method: "GET",
      redirect: "follow",
      referrerPolicy: "origin-when-cross-origin",
    };
    const url = `${deviceInstance.getDevice().api}/status`;
    const response = await fetch(url, options);
    const responseObj = await response.json();
    const shellyStatus = responseObj as ShellyPlugSStatus;
    if (!shellyStatus || !Object.keys(shellyStatus).length) {
      const status: DeviceStatus = {
        error: "Received empty status from shellyPlugS.",
        responsive: true,
        accessedAt,
        datapoints: {},
      };
      return status;
    }
    const power = getCurrentPower(shellyStatus);
    const innerTemperature = getInnerTemperature(shellyStatus);
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
    const datapoints: Partial<Record<ShellyPlugSDatapointId, DatapointState>> =
      {
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
    const status: DeviceStatus = { responsive: true, accessedAt, datapoints };
    return status;
  } catch (error) {
    const status: DeviceStatus = {
      error: `${deviceInstance.getDeviceId()}: ${error.toString()}`,
      responsive: false,
      accessedAt,
      datapoints: {},
    };
    return status;
  }
};

export const getIsRelayOn = (
  status: ShellyPlugSStatus
): boolean | undefined => {
  return status.relays?.length ? status.relays[0].ison : undefined;
};

export const getCurrentPower = (
  status: ShellyPlugSStatus
): number | undefined => {
  return status.meters?.length ? status.meters[0].power : undefined;
};

export const getEnergyCounterTotal = (
  status: ShellyPlugSStatus
): number | undefined => {
  return status.meters?.length ? status.meters[0].total : undefined;
};

export const getEnergySumsPreviousMinutes = (
  status: ShellyPlugSStatus
): number[] | undefined => {
  return status.meters?.length ? status.meters[0].counters : undefined;
};

/**
 *
 * @param status source
 * @returns [min, avg, max]
 */
export const getPowerStatistics = (
  status: ShellyPlugSStatus
): number[] | undefined => {
  return status.meters?.length ? status.meters[0].counters : undefined;
};

export const getInnerTemperature = (
  status: ShellyPlugSStatus
): number | undefined => {
  return status.tmp.tC;
};
