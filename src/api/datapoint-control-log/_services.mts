import { getQueryParametersSchema } from "../../json-schema/parameters.mjs";
import { getCurrentSystem } from "../../system/status/System.mjs";
import { ApiService } from "../Types.mjs";

const allServices: ApiService[] = [];

allServices.push({
  url: "/datapoint-control-log/select",
  method: "GET",
  parameters: getQueryParametersSchema(
    ["logged_at_from", "integer", true, "Interval start (in seconds)"],
    ["logged_at_to", "integer", true, "Interval end (in seconds)"]
  ),
  name: "Select rows by interval.",
  handler: async (req, res) => {
    try {
      const { logged_at_from = undefined, logged_at_to = undefined } =
        typeof req.query === "object" ? req.query : {};
      if (logged_at_from && logged_at_to) {
        const persistence = getCurrentSystem()?.getDefaultPersistence();
        if (persistence) {
          const response = await persistence.datapoint_control_log.select({
            logged_at_from,
            logged_at_to,
          });
          const { result, error } = response || {};
          if (error) {
            res.send({ error });
          } else {
            if (result) {
              res.send({ response: { result } });
            } else {
              res.send({ error: `Received undefined result from select.` });
            }
          }
        } else {
          res.send({
            error: "Currently is no default persistence available.",
          });
        }
      } else {
        res.send({
          error:
            "This url needs query parameters: ...?logged_at_from=<seconds of date>&logged_at_to=<seconds of date>",
        });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

export const services = allServices;
