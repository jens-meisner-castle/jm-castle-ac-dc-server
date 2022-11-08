import { DateTime, Duration } from "luxon";
import { isSimulation } from "../../devices/DeviceTypes.mjs";
import { PreviewOptions } from "../../devices/simulation/Types.mjs";
import { getStrictSingleQueryParametersSchema } from "../../json-schema/parameters.mjs";
import { getCurrentSystem } from "../../system/status/System.mjs";
import { ApiService } from "../Types.mjs";

const allServices: ApiService[] = [];

allServices.push({
  url: "/simulation/preview",
  method: "GET",
  parameters: getStrictSingleQueryParametersSchema(
    "deviceId",
    "ID of the (simulation) device",
    "string"
  ),
  name: "Get preview of the queried simulation (device).",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const {
          deviceId = undefined,
          precision = undefined,
          from = undefined,
          to = undefined,
        } = typeof req.query === "object" ? req.query : {};
        if (!deviceId) {
          res.send({ error: "This url needs a query parameter 'deviceId'." });
          return;
        }
        const configuredDevicesWithDatapoints = await system.getDevices();
        const selected = configuredDevicesWithDatapoints.find(
          (deviceWithDatapoints) => deviceWithDatapoints.device.id === deviceId
        );
        if (!selected) {
          res.send({
            error: `The specified device '${deviceId}' is not available.`,
          });
          return;
        }
        if (!isSimulation(selected.device.type)) {
          res.send({
            error: `The specified device '${deviceId}' is not a a simulation.`,
          });
          return;
        }
        const options: PreviewOptions = {};
        if (typeof precision === "string") {
          Object.assign(options, {
            precision: Duration.fromMillis(Number.parseInt(precision)),
          });
        }
        if (typeof from === "string" && typeof to === "string") {
          const fromMs = Number.parseInt(from);
          const toMs = Number.parseInt(to);
          if (typeof fromMs === "number" && typeof toMs === "number") {
            const interval = {
              from: DateTime.fromMillis(fromMs),
              to: DateTime.fromMillis(toMs),
            };
            Object.assign(options, { interval });
          }
        }
        const { result, error } = await system.getSimulationPreview(
          deviceId,
          options
        );
        if (error) {
          res.send({ error });
          return;
        } else {
          res.send({ response: { preview: result } });
          return;
        }
      } else {
        return res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      return res.send({ error: error.toString() });
    }
  },
});

export const services = allServices;
