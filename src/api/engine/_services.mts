import { Engine } from "../../engines/Types.mjs";
import {
  getOptionalSingleQueryParametersSchema,
  getQueryParametersSchema,
  getStrictSingleQueryParametersSchema,
} from "../../json-schema/parameters.mjs";
import { getCurrentSystem } from "../../system/status/System.mjs";
import { SerializableEngine } from "jm-castle-ac-dc-types/dist/All.mjs";
import { ApiService } from "../Types.mjs";

const allServices: ApiService[] = [];

allServices.push({
  url: "/engine",
  method: "GET",
  name: "Get all engines",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const availableEngines = await system.getEngines();
        const engineArr: { key: string; eng: Engine }[] = [];
        Object.keys(availableEngines).forEach((key) => {
          const eng = availableEngines[key];
          if (eng) {
            engineArr.push({ key, eng });
          }
        });
        const engineData: SerializableEngine[] = await Promise.all(
          engineArr.map((e) => e.eng.getSerializable())
        );
        res.send({ response: { engine: engineData } });
      } else {
        res.send({ error: "No system is currently available." });
      }
    } catch (error) {
      res.send({ error: error.toString() });
    }
  },
});

allServices.push({
  url: "/engine/status",
  method: "GET",
  parameters: getOptionalSingleQueryParametersSchema(
    "engineKey",
    "Key of the engine",
    "string"
  ),
  name: "Get status from queried engines.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { engineKey = undefined } =
          typeof req.query === "object" ? req.query : {};
        const availableEngines = await system.getEngines();
        const selectedEngine = availableEngines[engineKey];
        const usedEngines = selectedEngine
          ? [selectedEngine]
          : engineKey
          ? []
          : Object.keys(availableEngines).map((k) => availableEngines[k]);
        const status = await Promise.all(
          usedEngines.map((engine) => engine.status())
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
  url: "/engine/control/start",
  method: "GET",
  parameters: getStrictSingleQueryParametersSchema(
    "engineKey",
    "Key of the engine",
    "string"
  ),
  name: "Start the specified engine. This is a no-op if the engine was already started.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { engineKey = undefined } =
          typeof req.query === "object" ? req.query : {};
        if (!engineKey) {
          res.send({ error: "This url needs a query parameter 'engineKey'." });
          return;
        }
        const availableEngines = await system.getEngines();
        const selectedEngine = availableEngines[engineKey];
        if (!selectedEngine) {
          res.send({
            error: `The specified engine '${engineKey}' is not available.`,
          });
          return;
        }
        await selectedEngine.start();
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
  url: "/engine/control/stop",
  method: "GET",
  parameters: getStrictSingleQueryParametersSchema(
    "engineKey",
    "Key of the engine",
    "string"
  ),
  name: "Stop the specified engine. This is a no-op if the engine was already stopped.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { engineKey = undefined } =
          typeof req.query === "object" ? req.query : {};
        if (!engineKey) {
          res.send({ error: "This url needs a query parameter 'engineKey'." });
          return;
        }
        const availableEngines = await system.getEngines();
        const selectedEngine = availableEngines[engineKey];
        if (!selectedEngine) {
          res.send({
            error: `The specified engine '${engineKey}' is not available.`,
          });
          return;
        }
        await selectedEngine.stop();
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
  url: "/engine/action",
  method: "GET",
  parameters: getQueryParametersSchema(
    ["engineKey", "string", true, "Target for the action"],
    ["actionId", "string", true, "The action to execute"]
  ),
  name: "Execute the defined action within the specified engine.",
  handler: async (req, res) => {
    try {
      const system = getCurrentSystem();
      if (system) {
        const { engineKey = undefined, actionId = undefined } =
          typeof req.query === "object" ? req.query : {};
        if (!engineKey || !actionId) {
          res.send({
            error:
              "This url needs a query parameter 'engineKey' and a parameter 'actionId'.",
          });
          return;
        }
        const response = await system.consumeEngineControlAction(
          engineKey,
          actionId
        );
        res.send({ response });
      } else {
        res.send({
          success: false,
          error: "No system is currently available.",
        });
      }
    } catch (error) {
      res.send({ success: false, error: error.toString() });
    }
  },
});

export const services = allServices;
