import { RequestHandler } from "express";
import { DeviceType, isSimulation } from "../devices/DeviceTypes.mjs";
import {
  QueryParametersSchema,
  SerializableDeviceType,
  SerializableService,
} from "../Types.mjs";

export interface ApiService {
  url: string;
  parameters?: QueryParametersSchema;
  method: "GET";
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
