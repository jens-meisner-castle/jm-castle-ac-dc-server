import { DeviceTypeId } from "jm-castle-ac-dc-types";
import { supportedDeviceTypes } from "../../devices/DeviceTypes.mjs";
import { ApiService, getSerializableDeviceTypes } from "../Types.mjs";
const allServices: ApiService[] = [];

allServices.push({
  url: "/device-type",
  method: "GET",
  name: "Get all supported device types.",
  handler: (req, res) => {
    try {
      const type = getSerializableDeviceTypes(
        Object.keys(supportedDeviceTypes)
          .sort()
          .map((k: DeviceTypeId) => supportedDeviceTypes[k])
      );
      res.send({ response: { type } });
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

export const services = allServices;
