import { SimulationDeviceTypeId } from "jm-castle-ac-dc-types/dist/All.mjs";
import { makeDatacollectorPart as makeSimulationPart } from "../../../engines/data-collector/parts/Simulation.mjs";
import { DatacollectorPart } from "../../../engines/data-collector/Types.mjs";
import { DeviceInstance } from "../../DeviceInstance.mjs";
import { DeviceType } from "../../DeviceTypes.mjs";
import { fetchStatusFromSimulation, stopSimulation } from "../Status.mjs";

const deviceTypeId: SimulationDeviceTypeId = "sim-file";

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

export const SimulationFileType: DeviceType = {
  id: deviceTypeId,
  name: "Simuliert Werte, die aus einer Datei gelesen werden (Quelle: api vom Device)",
  isSimulation: true,
  simulation: { dateLevel: "day" },
  description: `Die Datei, die verwendet werden soll, wird in der Eigenschaft "api" (im 'URL-Format') vom Device eingetragen, z.B. internal://sim?file=public/sim/solari-01-power.json.
  Zusätzlich müssen die Datenpunkte über die Eigenschaft "datapoints" im Device spezifiziert werden. Siehe Beispiel(e).`,
  datapoints: {},
  controlDatapoints: {},
  examples: [
    {
      id: "sim-solari-01",
      ipAddress: "127.0.0.1",
      webInterface: "/device",
      api: "internal://sim?file=public/sim/solari-01-power.json",
      type: deviceTypeId,
      datapoints: {
        power: {
          localId: "power",
          name: "Aktuelle Leistung",
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
