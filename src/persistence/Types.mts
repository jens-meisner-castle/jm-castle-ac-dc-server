import {
  InsertResponse,
  Row_DatapointControlLog,
  Row_DatapointLog,
  SelectResponse,
} from "jm-castle-ac-dc-types/dist/All.mjs";
import { ControlContext } from "../engines/ControlContext.mjs";
import { EngineContext } from "../engines/EngineContext.mjs";
import { PersistPart } from "../engines/persist/Types.mjs";
import { Filter_LoggedAt_FromTo_Seconds } from "./maria-db/query/QueryUtils.mjs";

export interface Persistence {
  type: () => string;
  datapoint_log: {
    makePersistPart: (...datapoints: string[]) => PersistPart<EngineContext>;
    insertNow: (values: Row_DatapointLog) => Promise<InsertResponse>;
    select: (
      filter: Filter_LoggedAt_FromTo_Seconds
    ) => Promise<SelectResponse<Row_DatapointLog>>;
  };
  datapoint_control_log: {
    makePersistPart: (
      datapoints: Record<string, string[]>
    ) => PersistPart<ControlContext>;
    insertNow: (values: Row_DatapointControlLog) => Promise<InsertResponse>;
    select: (
      filter: Filter_LoggedAt_FromTo_Seconds
    ) => Promise<SelectResponse<Row_DatapointControlLog>>;
  };
  disconnect: () => Promise<void>;
}

export type PersistencePartRunResponse =
  | {
      success: false;
      error: string;
    }
  | { success: true; error?: never };

export interface PersistencePart {
  run: (context: EngineContext) => Promise<PersistencePartRunResponse>;
}
