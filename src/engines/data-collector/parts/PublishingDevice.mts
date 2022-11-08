import { DeviceInstance } from "../../../devices/DeviceInstance.mjs";
import { getCurrentSystem } from "../../../system/status/System.mjs";
import { EngineContext } from "../../EngineContext.mjs";
import { EngineContextConsumer } from "../../Types.mjs";
import { DatacollectorPart, DatacollectorPartRunResponse } from "../Types.mjs";

export const makeDatacollectorPart = async (
  deviceInstance: DeviceInstance,
  ...ids: string[]
): Promise<DatacollectorPart> => {
  const onEvent = (consumer: EngineContextConsumer) => {
    deviceInstance.addDeviceEventConsumer(consumer);
  };
  const run = async (
    context: EngineContext
  ): Promise<DatacollectorPartRunResponse> => {
    try {
      const { api: url, id: deviceId } = deviceInstance.getDevice();
      const system = getCurrentSystem();
      const status = await system.getDeviceStatus(deviceId);
      const { datapoints, error } = status || {};
      if (error) {
        return { success: false, error: error.toString() };
      } else {
        if (datapoints) {
          const stateErrors: string[] = [];
          ids.forEach((id) => {
            const state = datapoints[id] || datapoints[`${id}@${deviceId}`];
            if (!state) {
              stateErrors.push(
                `Datapoint "${id}" of device "${deviceId}" is not availabe in status of device.`
              );
            } else {
              const { valueNum, valueString, at, id } = state;
              const datapoint =
                deviceInstance.getPublicDatapointForPublicGlobalId(id) ||
                deviceInstance.getPublicDatapointForPublicLocalId(id);
              datapoint &&
                context.setDatapoint(
                  { ...datapoint },
                  {
                    id: datapoint.id,
                    at,
                    valueNum,
                    valueString,
                  }
                );
            }
          });
          return { success: true };
        } else {
          const error = `Status or status.datapoints in response from device ${deviceId} at "${url}" is undefined.`;
          console.error(error);
          return {
            success: false,
            error,
          };
        }
      }
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };
  return { onEvent, run };
};
