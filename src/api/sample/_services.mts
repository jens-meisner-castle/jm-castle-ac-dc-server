import { Row_Sample } from "jm-castle-ac-dc-types";
import {
  ApiServiceResponse,
  BadRequestMissingParameterCode,
  UnknownErrorCode,
} from "jm-castle-types";
import {
  getOptionalSingleQueryParametersSchema,
  getStrictSingleQueryParametersSchema,
} from "../../json-schema/parameters.mjs";
import { addJokerToFilterValue } from "../../utils/Sql.js";
import { ApiService } from "../Types.mjs";
import {
  handleError,
  handleErrorOrUndefinedResult,
  withDefaultPersistence,
} from "../Utils.mjs";

const allServices: ApiService[] = [];

allServices.push({
  url: "/sample/select",
  method: "GET",
  parameters: getOptionalSingleQueryParametersSchema(
    "name",
    "A fragment of the name to search.",
    "string"
  ),
  name: "Select samples by name.",
  handler: async (req, res) => {
    try {
      const { name = undefined } =
        typeof req.query === "object" ? req.query : {};
      const usedName = name ? addJokerToFilterValue(name) : "%";
      withDefaultPersistence(res, async (persistence) => {
        const response = await persistence.tables.sample.select({
          name: usedName,
        });
        const { result, error, errorCode, errorDetails } = response || {};
        if (
          handleErrorOrUndefinedResult(
            res,
            result,
            errorCode || "-1",
            error,
            errorDetails
          )
        ) {
          return;
        }
        const apiResponse: ApiServiceResponse<{ result: typeof result }> = {
          response: { result },
        };
        return res.send(apiResponse);
      });
    } catch (error) {
      return handleError(res, UnknownErrorCode, error.toString());
    }
  },
});

allServices.push({
  url: "/sample/insert",
  method: "POST",
  parameters: getStrictSingleQueryParametersSchema(
    "sample_id",
    "The id of the sample to create.",
    "string"
  ),
  name: "Insert a new sample.",
  handler: async (req, res) => {
    try {
      const sample: Row_Sample = req.body;
      const { sample_id = undefined } =
        typeof req.query === "object" ? req.query : {};
      if (sample_id) {
        withDefaultPersistence(res, async (persistence) => {
          const response = await persistence.tables.sample.insert({
            ...sample,
          });
          const { result, error, errorCode, errorDetails } = response || {};
          if (
            handleErrorOrUndefinedResult(
              res,
              result,
              errorCode || "-1",
              error,
              errorDetails
            )
          ) {
            return;
          }
          const apiResponse: ApiServiceResponse<{ result: typeof result }> = {
            response: { result },
          };
          return res.send(apiResponse);
        });
      } else {
        return handleError(
          res,
          BadRequestMissingParameterCode,
          "This url needs a query parameter: ...?sample_id=<id of the sample>"
        );
      }
    } catch (error) {
      return handleError(res, UnknownErrorCode, error.toString());
    }
  },
});

allServices.push({
  url: "/sample/update",
  method: "POST",
  parameters: getStrictSingleQueryParametersSchema(
    "sample_id",
    "The id of the sample to update.",
    "string"
  ),
  name: "Update an existing sample.",
  handler: async (req, res) => {
    try {
      const sample: Row_Sample = req.body;
      const { sample_id = undefined } =
        typeof req.query === "object" ? req.query : {};
      if (sample_id) {
        withDefaultPersistence(res, async (persistence) => {
          const response = await persistence.tables.sample.update({
            ...sample,
          });
          const { result, error, errorCode, errorDetails } = response || {};
          if (
            handleErrorOrUndefinedResult(
              res,
              result,
              errorCode || "-1",
              error,
              errorDetails
            )
          ) {
            return;
          }
          const apiResponse: ApiServiceResponse<{ result: typeof result }> = {
            response: { result },
          };
          return res.send(apiResponse);
        });
      } else {
        return handleError(
          res,
          BadRequestMissingParameterCode,
          "This url needs a query parameter: ...?sample_id=<id of the sample>"
        );
      }
    } catch (error) {
      return handleError(res, UnknownErrorCode, error.toString());
    }
  },
});

export const services = allServices;
