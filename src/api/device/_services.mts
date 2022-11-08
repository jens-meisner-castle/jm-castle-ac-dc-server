import {
  getOptionalSingleQueryParametersSchema,
  getStrictSingleQueryParametersSchema,
} from "../../json-schema/parameters.mjs";
import { getCurrentSystem } from "../../system/status/System.mjs";
import { ApiService } from "../Types.mjs";

const allServices: ApiService[] = [];

allServices.push({
  url: "/device",
  method: "GET",
  name: "Get all configured devices.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const device = await system.getDevices();
        res.send({ response: { device } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

allServices.push({
  url: "/device/status",
  method: "GET",
  parameters: getOptionalSingleQueryParametersSchema(
    "deviceId",
    "ID of the device",
    "string"
  ),
  name: "Get status from queried devices.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { deviceId = undefined } =
          typeof req.query === "object" ? req.query : {};
        const configuredDevicesWithDatapoints = await system.getDevices();
        const usedDevices = deviceId
          ? configuredDevicesWithDatapoints.filter(
              (deviceWithDatapoints) =>
                deviceWithDatapoints.device.id === deviceId
            )
          : configuredDevicesWithDatapoints;
        const status = await Promise.all(
          usedDevices.map((deviceWithDatapoints) =>
            system.getDeviceStatus(deviceWithDatapoints.device.id)
          )
        );
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
  url: "/device/web-interface",
  method: "GET",
  parameters: getStrictSingleQueryParametersSchema(
    "deviceId",
    "ID of the device.",
    "string"
  ),
  name: "Show web interface of queried device.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { deviceId = undefined } =
          typeof req.query === "object" ? req.query : {};
        if (!deviceId) {
          res.send({
            error:
              "This url needs a query parameter: ...?deviceId=<selected device>",
          });
        } else {
          const configuredDevicesWithDatapoints = await system.getDevices();
          const selected = configuredDevicesWithDatapoints.find(
            (deviceWithDatapoints) =>
              deviceWithDatapoints.device.id === deviceId
          );
          if (selected) {
            res.redirect(selected.device.webInterface);
          } else {
            res.send({ error: `No device found with id: ${deviceId}` });
          }
        }
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

export const services = allServices;
