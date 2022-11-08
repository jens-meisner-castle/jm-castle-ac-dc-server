import { makeDatacollectorPart as makeSimulationPart } from "../../../engines/data-collector/parts/Simulation.mjs";
import { DatacollectorPart } from "../../../engines/data-collector/Types.mjs";
import { LocalDatapoint, SimulationDeviceTypeId } from "../../../Types.mjs";
import { DeviceInstance } from "../../DeviceInstance.mjs";
import { DeviceType } from "../../DeviceTypes.mjs";
import { fetchStatusFromSimulation, stopSimulation } from "../Status.mjs";

const deviceTypeId: SimulationDeviceTypeId = "sim-day-night";

const fetchStatus = (deviceInstance: DeviceInstance) =>
  fetchStatusFromSimulation(
    deviceInstance.getDevice(),
    deviceInstance.getDeviceType().id
  );
const makeDatacollectorPart = async (
  deviceInstance: DeviceInstance,
  ...datapoints: string[]
): Promise<DatacollectorPart> =>
  makeSimulationPart(deviceInstance, fetchStatus, ...datapoints);

export const deviceDatapoints = (): Partial<
  Record<
    "is-daylight" | "daylight-duration" | "sunrise-at" | "sunset-at",
    LocalDatapoint
  >
> => ({
  "is-daylight": {
    localId: "is-daylight",
    name: "Tageslicht?",
    valueType: "boolean",
  },
  "daylight-duration": {
    localId: "daylight-duration",
    name: "Dauer Tageslicht",
    valueType: "number",
    valueUnit: "min",
  },
  "sunrise-at": {
    localId: "sunrise-at",
    name: "Sonnenaufgang",
    valueType: "date",
  },
  "sunset-at": {
    localId: "sunset-at",
    name: "Sonnenuntergang",
    valueType: "date",
  },
});

export const SimulationDayAndNightType: DeviceType = {
  id: deviceTypeId,
  name: "Liefert Daten zu Sonnen-aufgang und -untergang in Abhängigkeit von Längen- und Breitengrad",
  description:
    "Die Daten werden berechnet und haben eine max. Abweichung von +/- 5 Minuten.",
  isSimulation: true,
  simulation: { dateLevel: "year" },
  datapoints: deviceDatapoints(),
  controlDatapoints: {},
  examples: [
    {
      id: "sim-day-night",
      ipAddress: "127.0.0.1",
      webInterface: "/device",
      api: "internal://sim?longitude=9.99&latitude=53.55",
      type: "sim-day-night",
    },
  ],
  makeDatacollectorPart,
  fetchStatus,
  disconnectFromDevice: (deviceInstance) =>
    stopSimulation(
      deviceInstance.getDevice(),
      deviceInstance.getDeviceType().id
    ),
};
