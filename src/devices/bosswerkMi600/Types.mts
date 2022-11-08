import { DeviceType } from "../DeviceTypes.mjs";
import { fetchStatusFromDevice } from "./Status.mjs";

export const BosswerkMi600: DeviceType = {
  id: "bosswerk-mi-600",
  name: "Bosswerk Wechselrichter MI600",
  isSimulation: false,
  description: `Verschiedene Versuche (status.html, MODBUS via port 8899), Daten direkt vom Wechselrichter zu erhalten, sind fehlgeschlagen.
  Der nächste Versuch ist: Zugriff über die Solatrman Cloud. Aktuell kann dieses Device nicht in einem datacollector verwendet werden.`,
  datapoints: {},
  controlDatapoints: {},
  makeDatacollectorPart: undefined,
  fetchStatus: fetchStatusFromDevice,
  disconnectFromDevice: async () => {
    return;
  },
};
