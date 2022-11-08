import { services as datapointControlLogServices } from "./datapoint-control-log/_services.mjs";
import { services as datapointLogServices } from "./datapoint-log/_services.mjs";
import { services as deviceTypeServices } from "./device-type/_services.mjs";
import { services as deviceServices } from "./device/_services.mjs";
import { services as engineServices } from "./engine/_services.mjs";
import { services as simulationServices } from "./simulation/_services.mjs";
import { services as systemServices } from "./system/_services.mjs";
import { ApiService, getSerializableServices } from "./Types.mjs";

const allServices: ApiService[] = [];

allServices.push(...systemServices);
allServices.push(...deviceServices);
allServices.push(...simulationServices);
allServices.push(...deviceTypeServices);
allServices.push(...datapointLogServices);
allServices.push(...datapointControlLogServices);
allServices.push(...engineServices);

allServices.push({
  url: "/",
  method: "GET",
  name: "Get available services.",
  handler: async (req, res) => {
    try {
      const services = getSerializableServices(allServices);
      res.send({ response: { services } });
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

export const services = allServices;
