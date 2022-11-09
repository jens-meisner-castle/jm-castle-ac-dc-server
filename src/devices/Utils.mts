import { Datapoint, LocalDatapoint } from "jm-castle-ac-dc-types/dist/All.mjs";

export const deviceDatapointsIntermediate = (
  localDps: Record<string, LocalDatapoint>
) => {
  const dps: Record<string, Datapoint> = {};
  Object.entries(localDps).forEach(
    ([k, datapoint]) =>
      (dps[k] = {
        name: datapoint.name,
        note: datapoint.note,
        id: datapoint.localId,
        valueType: datapoint.valueType,
        valueUnit: datapoint.valueUnit,
      })
  );
  return dps;
};
