import { DeviceType } from "../DeviceTypes.mjs";
import { fetchStatusFromDevice } from "./Status.mjs";

export const HichiSmlReader: DeviceType = {
  id: "hichi-sml-reader",
  name: "Hichi SML Lesekopf",
  isSimulation: false,
  description: `Liest Daten per SML vom Stromzähler. Daten werden über mqtt bereitgestellt.`,
  datapoints: {},
  controlDatapoints: {},
  makeDatacollectorPart: undefined,
  fetchStatus: fetchStatusFromDevice,
  disconnectFromDevice: async () => {
    return;
  },
};
