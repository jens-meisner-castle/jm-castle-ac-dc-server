import { DatapointMapping } from "../../../Types.mjs";
import { EngineContext } from "../../EngineContext.mjs";
import { DatastatePart, DatastatePartRunResponse } from "../Types.mjs";

export class DatapointMapper implements DatastatePart {
  constructor(map: DatapointMapping) {
    this.map = map;
    return this;
  }

  private map: DatapointMapping;

  public run = async (
    context: EngineContext
  ): Promise<DatastatePartRunResponse> => {
    try {
      Object.keys(this.map).forEach((k) => {
        const { state, point } = context.getDatapoint(k) || {};
        if (state) {
          const { id } = this.map[k];
          id && context.setDatapoint({ ...point, id }, { ...state, id });
        }
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };
}
