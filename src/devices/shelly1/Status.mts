import { DatapointState, DeviceStatus } from "jm-castle-ac-dc-types";
import fetch, { RequestInit } from "node-fetch";
import { DeviceInstance } from "../DeviceInstance.mjs";
import { Shelly1DatapointId, Shelly1Status } from "./Types.mjs";

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
    const shellyStatus = responseObj as Shelly1Status;
    if (!shellyStatus || !Object.keys(shellyStatus).length) {
      const status: DeviceStatus = {
        error: "Received empty status from Shelly1.",
        responsive: true,
        accessedAt,
        datapoints: {},
      };
      return status;
    }
    const externalTemperatures = getExternalTemperatures(shellyStatus);
    const externalTemperature1 = externalTemperatures["0"];
    const externalTemperature2 = externalTemperatures["1"];
    const externalTemperature3 = externalTemperatures["2"];
    const isRelayOn = getIsRelayOn(shellyStatus);
    const datapoints: Partial<Record<Shelly1DatapointId, DatapointState>> = {
      "relay-state": {
        id: "relay-state",
        valueNum: isRelayOn ? 1 : 0,
        valueString: isRelayOn ? "true" : "false",
        at: accessedAt,
      },
    };
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
      error: `${deviceInstance.getDeviceId()}: ${error.toString()}`,
      responsive: false,
      accessedAt,
      datapoints: {},
    };
    return status;
  }
};

export const getIsRelayOn = (status: Shelly1Status): boolean | undefined => {
  return status.relays?.length ? status.relays[0].ison : undefined;
};

export const getExternalTemperatures = (
  status: Shelly1Status
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
