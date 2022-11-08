import { QueryParametersSchema } from "../Types.mjs";

export const defaultFields = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
};

export const getId = (url: string) => ({ $id: url });

export const getStrictSingleQueryParametersSchema = (
  field: string,
  description: string,
  type: "string" | "integer"
): QueryParametersSchema => ({
  type: "object",
  properties: {
    [field]: {
      description,
      type,
    },
  },
  required: [field],
});

export const getOptionalSingleQueryParametersSchema = (
  field: string,
  description: string,
  type: "string" | "integer"
): QueryParametersSchema => ({
  type: "object",
  properties: {
    [field]: {
      description,
      type,
    },
  },
});
/**
 *
 * @param tuples [field, type, required?, description]
 * @returns JSON Schema
 */
export const getQueryParametersSchema = (
  ...tuples: [string, "string" | "integer", boolean, string][]
): QueryParametersSchema => {
  const properties: Record<string, unknown> = {};
  tuples.forEach((t) => (properties[t[0]] = { type: t[1], description: t[3] }));
  const required = tuples.filter((t) => t[2]).map((t) => t[0]);
  return {
    type: "object",
    properties,
    required,
  };
};
