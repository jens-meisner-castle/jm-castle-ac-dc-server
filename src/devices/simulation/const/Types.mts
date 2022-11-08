import { makeDatacollectorPart as makeSimulationPart } from "../../../engines/data-collector/parts/Simulation.mjs";
import { DatacollectorPart } from "../../../engines/data-collector/Types.mjs";
import { SimulationDeviceTypeId } from "../../../Types.mjs";
import { DeviceInstance } from "../../DeviceInstance.mjs";
import { DeviceType } from "../../DeviceTypes.mjs";
import { fetchStatusFromSimulation, stopSimulation } from "../Status.mjs";

const deviceTypeId: SimulationDeviceTypeId = "sim-const";

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

export const SimulationConstType: DeviceType = {
  id: deviceTypeId,
  name: "Simuliert einen oder mehrere konstante Werte (Quelle: api vom Device)",
  isSimulation: true,
  simulation: { dateLevel: "day" },
  description: `Die Werte, die geliefert werden sollen, werden in der Eigenschaft "api" (im 'URL-Format') vom Device eingetragen, z.B. internal://sim?basic-load=120.
  Zusätzlich müssen die Datenpunkte über die Eigenschaft "datapoints" im Device spezifiziert werden. Siehe Beispiel(e).`,
  datapoints: {},
  controlDatapoints: {},
  examples: [
    {
      id: "sim-basic-load",
      ipAddress: "127.0.0.1",
      webInterface: "/device",
      api: "internal://sim?basic-load=120",
      type: deviceTypeId,
      datapoints: {
        "basic-load": {
          localId: "basic-load",
          name: "Konstante Grundlast",
          valueType: "number",
          valueUnit: "W",
        },
      },
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
