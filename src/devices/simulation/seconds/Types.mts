import { LocalDatapoint, SimulationDeviceTypeId } from "jm-castle-ac-dc-types";
import { makeDatacollectorPart as makeSimulationPart } from "../../../engines/data-collector/parts/Simulation.mjs";
import { DatacollectorPart } from "../../../engines/data-collector/Types.mjs";
import { DeviceInstance } from "../../DeviceInstance.mjs";
import { DeviceType } from "../../DeviceTypes.mjs";
import { fetchStatusFromSimulation, stopSimulation } from "../Status.mjs";

const deviceTypeId: SimulationDeviceTypeId = "sim-seconds";

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
  Record<"seconds", LocalDatapoint>
> => ({
  seconds: {
    localId: "seconds",
    name: "Sekundenwert der aktuellen Zeit (0-59)",
    valueType: "number",
    valueUnit: "s",
  },
});

export const SimulationSecondsType: DeviceType = {
  id: deviceTypeId,
  name: "Liefert den Sekundenwert der aktuellen Zeit (0-59)",
  isSimulation: true,
  simulation: { dateLevel: "day" },
  datapoints: deviceDatapoints(),
  controlDatapoints: {},
  examples: [
    {
      id: "example-sim-seconds",
      ipAddress: "127.0.0.1",
      webInterface: "/device",
      api: "internal://sim",
      type: deviceTypeId,
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
