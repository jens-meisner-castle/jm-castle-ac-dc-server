import { Datapoint } from "jm-castle-ac-dc-types";
import { DateTime } from "luxon";
import { CastleAcDc } from "../../../system/status/System.mjs";
import { getDateFormat } from "../../../utils/Format.mjs";
import { EngineContext } from "../../EngineContext.mjs";
import { DatastatePart, DatastatePartRunResponse } from "../Types.mjs";

let defaultDatapoints: Record<string, Datapoint>;

export const getDefaultDatapoints = () => {
  if (defaultDatapoints) {
    return defaultDatapoints;
  }
  defaultDatapoints = {
    "started-at@system": {
      id: "started-at@system",
      name: "Systemstart",
      valueType: "date",
    },
  };
  return defaultDatapoints;
};

export class DefaultStatePart implements DatastatePart {
  constructor(system: CastleAcDc) {
    this.system = system;
    return this;
  }

  private system: CastleAcDc;

  public run = async (
    context: EngineContext
  ): Promise<DatastatePartRunResponse> => {
    try {
      const systemStatus = await this.system.getStatus();
      const datapoints = getDefaultDatapoints();
      const startedAtDp = datapoints["started-at@system"];
      startedAtDp &&
        context.setDatapoint(startedAtDp, {
          id: startedAtDp.id,
          valueNum: systemStatus.startedAt,
          valueString: DateTime.fromMillis(systemStatus.startedAt).toFormat(
            getDateFormat("second")
          ),
          at: Date.now(),
        });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };
}
