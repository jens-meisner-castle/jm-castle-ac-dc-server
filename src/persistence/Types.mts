import {
  Row_DatapointControlLog,
  Row_DatapointLog,
  Row_Sample,
} from "jm-castle-ac-dc-types";
import {
  InsertResponse,
  SelectResponse,
  UpdateResponse,
} from "jm-castle-types";
import { ControlContext } from "../engines/ControlContext.mjs";
import { EngineContext } from "../engines/EngineContext.mjs";
import { PersistPart } from "../engines/persist/Types.mjs";
import {
  Filter_LoggedAt_FromTo_Seconds,
  Filter_NameLike,
} from "./maria-db/query/QueryUtils.mjs";

export interface Persistence {
  type: () => string;
  tables: {
    sample: {
      insert: (values: Row_Sample) => Promise<InsertResponse<Row_Sample>>;
      update: (values: Row_Sample) => Promise<UpdateResponse<Row_Sample>>;
      select: (filter: Filter_NameLike) => Promise<SelectResponse<Row_Sample>>;
      selectByKey: (sampleId: string) => Promise<SelectResponse<Row_Sample>>;
      all: () => Promise<SelectResponse<Row_Sample>>;
    };
  };
  datapoint_log: {
    makePersistPart: (...datapoints: string[]) => PersistPart<EngineContext>;
    insertNow: (
      values: Row_DatapointLog
    ) => Promise<InsertResponse<Row_DatapointLog>>;
    select: (
      filter: Filter_LoggedAt_FromTo_Seconds
    ) => Promise<SelectResponse<Row_DatapointLog>>;
  };
  datapoint_control_log: {
    makePersistPart: (
      datapoints: Record<string, string[]>
    ) => PersistPart<ControlContext>;
    insertNow: (
      values: Row_DatapointControlLog
    ) => Promise<InsertResponse<Row_DatapointControlLog>>;
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
