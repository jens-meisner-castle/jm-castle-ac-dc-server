import { DeviceInstance } from "../DeviceInstance.mjs";

export const fetchStatusFromDevice = async (
  deviceInstance: DeviceInstance
) => ({
  accessedAt: Date.now(),
  responsive: false,
  datapoints: {},
});
