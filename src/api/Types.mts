import { RequestHandler } from "express";
import {
  QueryParametersSchema,
  SerializableDeviceType,
  SerializableService,
} from "jm-castle-ac-dc-types";
import { DeviceType } from "../devices/DeviceTypes.mjs";

import { ErrorCode } from "jm-castle-types";

export type ApiServiceResponse<T> =
  | {
      response: T;
      error?: never;
      errorCode?: never;
      errorDetails?: never;
    }
  | {
      response?: never;
      error: string;
      errorCode?: ErrorCode;
      errorDetails?: Record<string, unknown>;
    };

export interface ApiService {
  url: string;
  parameters?: QueryParametersSchema;
  method: "GET" | "POST";
  scope?: "public" | "private";
  name: string;
  handler: RequestHandler<
    Record<string, any>,
    any,
    any,
    any,
    Record<string, any>
  >;
}

export const getSerializableServices = (services: ApiService[]) => {
  const serializable: SerializableService[] = [];
  services.forEach((service) => {
    serializable.push({
      url: service.url,
      method: service.method,
      parameters: service.parameters,
      name: service.name,
      scope: service.scope,
    });
  });
  return serializable;
};

export const getSerializableDeviceTypes = (types: DeviceType[]) => {
  const serializable: SerializableDeviceType[] = [];
  types.forEach((type) => {
    serializable.push({
      datapoints: type.datapoints,
      controlDatapoints: type.controlDatapoints,
      examples: type.examples,
      id: type.id,
      name: type.name,
      description: type.description,
      isSimulation: type.isSimulation,
      simulation: type.simulation,
    });
  });
  return serializable;
};
