import fetch, { RequestInit } from "node-fetch";
import {
  DatapointState,
  Device,
  DeviceControlResponse,
  DeviceStatus,
} from "../../Types.mjs";
import { DeviceInstance } from "../DeviceInstance.mjs";
import {
  Shelly25DatapointId,
  Shelly25RelayControlResponse,
  Shelly25Status,
} from "./Types.mjs";

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
    const shellyStatus = responseObj as Shelly25Status;
    if (!shellyStatus || !Object.keys(shellyStatus).length) {
      const status: DeviceStatus = {
        error: "Received empty status from shelly 2.5.",
        responsive: true,
        accessedAt,
        datapoints: {},
      };
      return status;
    }
    const voltage = getCurrentVoltage(shellyStatus);
    const power1 = getCurrentPower(0, shellyStatus);
    const power2 = getCurrentPower(1, shellyStatus);
    const innerTemperature = getInnerTemperature(shellyStatus);
    const energyCounterTotal1 = getEnergyCounterTotal(0, shellyStatus);
    const energyCounterTotal2 = getEnergyCounterTotal(1, shellyStatus);
    const isRelay1On = getIsRelayOn(0, shellyStatus);
    const isRelay2On = getIsRelayOn(1, shellyStatus);
    const datapoints: Partial<Record<Shelly25DatapointId, DatapointState>> = {
      voltage: { id: "voltage", valueNum: voltage, at: accessedAt },
      "power-1": { id: "power-1", valueNum: power1, at: accessedAt },
      "power-2": { id: "power-2", valueNum: power2, at: accessedAt },
      "inner-temperature": {
        id: "inner-temperature",
        valueNum: innerTemperature,
        at: accessedAt,
      },
      "energy-counter-total-1": {
        id: "energy-counter-total-1",
        valueNum: energyCounterTotal1,
        at: accessedAt,
      },
      "energy-counter-total-2": {
        id: "energy-counter-total-2",
        valueNum: energyCounterTotal2,
        at: accessedAt,
      },
      "relay-state-1": {
        id: "relay-state-1",
        valueNum: isRelay1On ? 1 : 0,
        valueString: isRelay1On ? "true" : "false",
        at: accessedAt,
      },
      "relay-state-2": {
        id: "relay-state-2",
        valueNum: isRelay2On ? 1 : 0,
        valueString: isRelay2On ? "true" : "false",
        at: accessedAt,
      },
    };
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

export const getIsRelayOn = (
  index: 0 | 1,
  status: Shelly25Status
): boolean | undefined => {
  return status.relays?.length ? status.relays[index].ison : undefined;
};

export const getCurrentPower = (
  index: 0 | 1,
  status: Shelly25Status
): number | undefined => {
  return status.meters?.length ? status.meters[index].power : undefined;
};

export const getCurrentVoltage = (
  status: Shelly25Status
): number | undefined => {
  return status.voltage;
};

export const getEnergyCounterTotal = (
  index: 0 | 1,
  status: Shelly25Status
): number | undefined => {
  return status.meters?.length ? status.meters[index].total : undefined;
};

export const getInnerTemperature = (
  status: Shelly25Status
): number | undefined => {
  return status.tmp.tC;
};

export const executeControlRequestOnDevice = async (
  device: Device,
  states: DatapointState[]
): Promise<DeviceControlResponse> => {
  try {
    const baseUrl = device.api;
    const commands: { url: string; state: DatapointState }[] = [];
    const relay1State = states.find((state) => state.id === "relay-control-1");
    if (relay1State) {
      const { valueNum } = relay1State;
      const turnValue =
        valueNum === 1 ? "on" : valueNum === 0 ? "off" : undefined;
      turnValue &&
        commands.push({
          url: `${baseUrl}/relay/0?turn=${turnValue}`,
          state: relay1State,
        });
    }
    const relay2State = states.find((state) => state.id === "relay-control-2");
    if (relay2State) {
      const { valueNum } = relay2State;
      const turnValue =
        valueNum === 1 ? "on" : valueNum === 0 ? "off" : undefined;
      turnValue &&
        commands.push({
          url: `${baseUrl}/relay/1?turn=${turnValue}`,
          state: relay2State,
        });
    }
    const options: RequestInit = {
      method: "GET",
      redirect: "follow",
      referrerPolicy: "origin-when-cross-origin",
    };
    let success = true;
    let error: string | undefined = undefined;
    for (let i = 0; i < commands.length; i++) {
      const { url, state } = commands[i];
      const response = await fetch(url, options);
      const responseObj = await response.json();
      const controlResponse = responseObj as Shelly25RelayControlResponse;
      if (controlResponse.ison !== (state.valueNum === 1)) {
        success = false;
        error = `Bad response for relay control of device ${device.id} (id: ${
          state.id
        }). Response: ${JSON.stringify(controlResponse)}`;
      }
    }
    const response: DeviceControlResponse = success
      ? { success: true }
      : {
          success: false,
          error: error || "Bad state: No success, but no error.",
        };
    return response;
  } catch (error) {
    const response: DeviceControlResponse = {
      error: error.toString(),
      success: false,
    };
    return response;
  }
};
