import { DeviceInstance } from "../../../devices/DeviceInstance.mjs";
import { DeviceStatus } from "../../../Types.mjs";
import { EngineContext } from "../../EngineContext.mjs";
import { DatacollectorPart, DatacollectorPartRunResponse } from "../Types.mjs";

export const makeDatacollectorPart = async (
  deviceInstance: DeviceInstance,
  fetchStatus: (deviceInstance: DeviceInstance) => Promise<DeviceStatus>,
  ...ids: string[]
): Promise<DatacollectorPart> => {
  const run = async (
    context: EngineContext
  ): Promise<DatacollectorPartRunResponse> => {
    try {
      const { id: deviceId, api } = deviceInstance.getDevice();
      const status = await fetchStatus(deviceInstance);
      const { datapoints: datapointStates, error } = status || {};
      if (error) {
        return { success: false, error: error.toString() };
      } else {
        if (datapointStates) {
          const stateErrors: string[] = [];
          ids.forEach((id) => {
            const state =
              datapointStates[id] || datapointStates[`${id}@${deviceId}`];
            if (!state) {
              stateErrors.push(
                `Datapoint "${id}" of device "${deviceId}" is not availabe in status of Simulation at ${api} .`
              );
            } else {
              const { valueNum, valueString, at, id } = state;
              const datapoint =
                deviceInstance.getPublicDatapointForPublicGlobalId(id) ||
                deviceInstance.getPublicDatapointForPublicLocalId(id);
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
          const error = `Status or status.datapoints in response from device ${deviceId} at "${api}" is undefined.`;
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
  return { run };
};
