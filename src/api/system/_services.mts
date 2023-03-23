import { UniqueDatapoint } from "jm-castle-ac-dc-types";
import { executeSetup } from "jm-castle-mariadb";
import { ApiServiceResponse } from "jm-castle-types";
import { getOptionalSingleQueryParametersSchema } from "../../json-schema/parameters.mjs";
import {
  AllTables,
  MariaDbClient,
} from "../../persistence/maria-db/MariaDb.mjs";
import { getSystemSetupStatus } from "../../system/setup/Status.mjs";
import { getCurrentSystem } from "../../system/status/System.mjs";
import { ApiService } from "../Types.mjs";
import { withDefaultPersistence } from "../Utils.mjs";
const allServices: ApiService[] = [];

allServices.push({
  url: "/system/status",
  method: "GET",
  name: "Get the system status",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const status = await system.getStatus();
        res.send({ response: { status } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});
allServices.push({
  url: "/system/setup-status",
  method: "GET",
  name: "Get the system setup status",
  handler: async (req, res) => {
    try {
      const status = await getSystemSetupStatus();
      const apiResponse: ApiServiceResponse<typeof status> = {
        response: status,
      };
      return res.send(apiResponse);
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});
allServices.push({
  url: "/system/setup",
  method: "GET",
  name: "Do a system setup. This is a no-op if the system is already setup.",
  handler: async (req, res) => {
    try {
      withDefaultPersistence(res, async (persistence) => {
        if (persistence.type() !== "maria-db") {
          throw new Error(
            "Currently is only mariadb as default persistentce possible."
          );
        }
        const mariaClient = persistence as MariaDbClient;
        const setup = await executeSetup(
          mariaClient,
          mariaClient.getDatabaseName(),
          AllTables
        );
        const apiResponse: ApiServiceResponse<typeof setup> = {
          response: setup,
        };
        return res.send(apiResponse);
      });
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});
allServices.push({
  url: "/system/control/restart",
  method: "GET",
  name: "Executes a system restart. Current system stops everything and starts a new system based on the current configuration file.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        await system.restart();
        res.send({ response: { success: true } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});
allServices.push({
  url: "/system/data-state",
  method: "GET",
  name: "Get the current data state of the system.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const state = await system.getDatastateContent();
        res.send({ response: { state } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});
allServices.push({
  url: "/system/control-state",
  method: "GET",
  name: "Get the current control state of the system.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const state = await system.getControlstateContent();
        res.send({ response: { state } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});
allServices.push({
  url: "/system/persistent-datapoint",
  method: "GET",
  name: "Get the datapoints which are persistent in the current system.",
  parameters: getOptionalSingleQueryParametersSchema(
    "area",
    "ID of the persistence area (e.g. table) or 'all' to get all. If undefined => datapoint_log.",
    "string"
  ),
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { area = undefined } =
          typeof req.query === "object" ? req.query : {};
        const usedArea = area || "datapoint-log";
        const datapointArr: UniqueDatapoint[] = [];
        if (usedArea === "all") {
          const dpLog = await system.getPersistentDatapointsArray(
            "datapoint-log"
          );
          datapointArr.push(...dpLog);
          const dpControlLog = await system.getPersistentDatapointsArray(
            "datapoint-control-log"
          );
          datapointArr.push(...dpControlLog);
        } else {
          const some = await system.getPersistentDatapointsArray(area);
          datapointArr.push(...some);
        }
        res.send({ response: { datapoint: datapointArr } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

allServices.push({
  url: "/system/datastate-datapoint",
  method: "GET",
  name: "Get the datapoints which are available in the data state of the current system.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const datapoint = await system.getStateDatapointsArray();
        res.send({ response: { datapoint } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

allServices.push({
  url: "/system/device-datapoint",
  method: "GET",
  name: "Get the datapoints of the specified device or of all configured devices of the current system.",
  parameters: getOptionalSingleQueryParametersSchema(
    "deviceId",
    "ID of the device",
    "string"
  ),
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { deviceId = undefined } =
          typeof req.query === "object" ? req.query : {};
        const datapoint = await system.getDeviceDatapointsArray(deviceId);
        res.send({ response: { datapoint } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

allServices.push({
  url: "/system/device-control-datapoint",
  method: "GET",
  name: "Get the control datapoints of the specified device or of all configured devices of the current system.",
  parameters: getOptionalSingleQueryParametersSchema(
    "deviceId",
    "ID of the device",
    "string"
  ),
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { deviceId = undefined } =
          typeof req.query === "object" ? req.query : {};
        const datapoint = await system.getDeviceControlDatapointsArray(
          deviceId
        );
        res.send({ response: { datapoint } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

export const services = allServices;
