import {
  DatapointState,
  InsertResponse,
  LocalDatapointId,
  MariaDatabaseSpec,
  PersistentRow,
  Row_DatapointControlLog,
  Row_DatapointLog,
  SerializableEngine,
} from "jm-castle-ac-dc-types";
import { Table } from "jm-castle-types";
import { createPool, Pool } from "mariadb";
import { ControlContext } from "../../engines/ControlContext.mjs";
import { EngineContext } from "../../engines/EngineContext.mjs";
import { Engine } from "../../engines/Types.mjs";
import {
  Persistence,
  PersistencePart,
  PersistencePartRunResponse,
} from "../Types.mjs";
import {
  insert as insertIntoDatapointControlLog,
  select as selectFromDatapointControlLog,
} from "./query/DatapointControlLog.mjs";
import {
  insert as insertIntoDatapointLog,
  select as selectFromDatapointLog,
} from "./query/DatapointLog.mjs";
import { Filter_LoggedAt_FromTo_Seconds } from "./query/QueryUtils.mjs";
import { TableDatapoint } from "./tables/Datapoint.mjs";
import { TableDatapointControlLog } from "./tables/DatapointControlLog.mjs";
import { TableDatapointLog } from "./tables/DatapointLog.mjs";

export interface RunPartsResponse {
  // milliseconds of duration to run all parts
  duration: number;
  errors?: string[];
}

interface WithError {
  error?: string;
}

const joinErrors = (list: string[], withError: WithError[]) => {
  return `${list.join(" / ")}${
    list.length && withError.length ? " / " : ""
  }${withError.map((w) => w.error).join(" / ")}`;
};

export const AllTables: Table[] = [
  TableDatapoint,
  TableDatapointLog,
  TableDatapointControlLog,
];

const makeRunOnEngineContext = <R extends PersistentRow>(
  createRow: (state: DatapointState) => R,
  insertRow: (row: R) => Promise<InsertResponse>,
  ...ids: string[]
) => {
  const previousStates: Record<string, DatapointState> = {};
  const run = async (
    context: EngineContext
  ): Promise<PersistencePartRunResponse> => {
    try {
      const rows: R[] = [];
      const stateErrors: string[] = [];
      ids.forEach((id) => {
        const { state } = context.getDatapoint(id) || {};
        const previousState = previousStates[id];
        if (!state) {
          stateErrors.push(
            `Datapoint "${id}" is not availabe in engine context.".`
          );
        } else {
          const shouldInsert = !previousState || previousState.at !== state.at;
          shouldInsert && rows.push(createRow(state));
          previousStates[id] = state;
        }
      });
      const responses = await Promise.all(rows.map((row) => insertRow(row)));
      const responsesWithErr = responses.filter((r) => r.error);
      const error =
        stateErrors.length || responsesWithErr.length
          ? joinErrors(stateErrors, responsesWithErr)
          : undefined;
      error && console.error(error);
      return error ? { success: false, error } : { success: true };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };
  return run;
};

const makeRunOnControlContext = <R extends PersistentRow>(
  createRow: (
    device: string,
    datapoint: LocalDatapointId,
    state: DatapointState,
    executed: boolean,
    success: boolean
  ) => R,
  insertRow: (row: R) => Promise<InsertResponse>,
  datapointTargets: Record<string, LocalDatapointId[]>
) => {
  const run = async (
    context: ControlContext
  ): Promise<PersistencePartRunResponse> => {
    try {
      const rows: R[] = [];
      const stateErrors: string[] = [];
      Object.keys(datapointTargets).forEach((deviceId) => {
        const datapointIds = datapointTargets[deviceId];
        datapointIds.forEach((datapointId) => {
          const { state } =
            context.getDatapointTarget(deviceId, datapointId) || {};
          if (state) {
            rows.push(createRow(deviceId, datapointId, state, false, false));
          }
          const executed = context.getExecutedRequests(deviceId, datapointId);
          executed.forEach((exe) => {
            const { state, success } = exe;
            rows.push(createRow(deviceId, datapointId, state, true, success));
          });
        });
      });
      const responses = await Promise.all(rows.map((row) => insertRow(row)));
      const responsesWithErr = responses.filter((r) => r.error);
      const error =
        stateErrors.length || responsesWithErr.length
          ? joinErrors(stateErrors, responsesWithErr)
          : undefined;
      error && console.error(error);
      return error ? { success: false, error } : { success: true };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  };
  return run;
};

export interface MariaDbClientProps {
  engineId: string;
  spec: MariaDatabaseSpec;
}

export class MariaDbClient implements Persistence, Engine {
  constructor(props: MariaDbClientProps) {
    const { spec, engineId } = props;
    this.engineId = engineId;
    this.spec = spec;
    return this;
  }
  private engineId: string;
  private setupPool: Pool | undefined;
  private databasePool: Pool | undefined;
  private lastStartedAt: number | undefined;
  private lastLapEndAt: number | undefined;
  private spec: MariaDatabaseSpec;
  private running = false;
  private shouldRun = false;
  private lap = 0;
  private durations = { total: 0, lapStart: 0, lapEnd: 0 };
  private errors: { lap: number; errors: string[] }[] = [];
  private parts: PersistencePart[] = [];
  private handlePoolError = (error: Error) =>
    console.error("Received error from database pool: " + error.toString());
  public type = () => "maria-db";
  public datapoint_log = {
    makePersistPart: (...datapoints: string[]) => {
      const createRow = (state: DatapointState): Row_DatapointLog => {
        const { valueNum, valueString, id, at } = state;
        const changed_at = Math.floor(at / 1000);
        const changed_at_ms = at - changed_at * 1000;
        return {
          datapoint_id: id,
          value_num: valueNum,
          value_string: valueString,
          logged_at: 0,
          logged_at_ms: 0,
          changed_at,
          changed_at_ms,
        };
      };
      const insertRow = (row: Row_DatapointLog) =>
        this.datapoint_log.insertNow(row);
      const run = makeRunOnEngineContext(createRow, insertRow, ...datapoints);
      return {
        run,
      };
    },
    insertNow: (values: Row_DatapointLog) => {
      const now = Date.now();
      const logged_at = Math.floor(now / 1000);
      const logged_at_ms = Math.floor((now / 1000 - logged_at) * 1000);
      return insertIntoDatapointLog(
        { ...values, logged_at, logged_at_ms },
        this
      );
    },
    select: (filter: Filter_LoggedAt_FromTo_Seconds) =>
      selectFromDatapointLog(filter, this),
  };
  public datapoint_control_log = {
    makePersistPart: (datapoints: Record<string, LocalDatapointId[]>) => {
      const createRow = (
        deviceId: string,
        datapointId: LocalDatapointId,
        state: DatapointState,
        executed: boolean,
        success: boolean
      ): Row_DatapointControlLog => {
        const { valueNum, valueString, id: datapoint_id } = state;
        return {
          device_id: deviceId,
          datapoint_id,
          value_num: valueNum,
          value_string: valueString,
          executed: executed ? 1 : 0,
          success: success ? 1 : 0,
          logged_at: 0,
          logged_at_ms: 0,
        };
      };
      const insertRow = (row: Row_DatapointControlLog) =>
        this.datapoint_control_log.insertNow(row);
      const run = makeRunOnControlContext(createRow, insertRow, datapoints);
      return {
        run,
      };
    },
    insertNow: (values: Row_DatapointControlLog) => {
      const now = Date.now();
      const logged_at = Math.floor(now / 1000);
      const logged_at_ms = Math.floor((now / 1000 - logged_at) * 1000);
      return insertIntoDatapointControlLog(
        { ...values, logged_at, logged_at_ms },
        this
      );
    },
    select: (filter: Filter_LoggedAt_FromTo_Seconds) =>
      selectFromDatapointControlLog(filter, this),
  };
  public getDatabaseName = () => this.spec.database;
  public getDatabasePool = () => {
    if (!this.databasePool) {
      const { host, port, user, password, database } = this.spec;
      this.databasePool = createPool({
        host,
        port,
        user,
        password,
        database,
        connectionLimit: 10,
        decimalAsNumber: true,
      });
      // eslint-disable-next-line
      // @ts-ignore
      this.databasePool.on("error", this.handlePoolError);
    }

    return this.databasePool;
  };
  public getSetupPool = () => {
    if (!this.setupPool) {
      const { host, port, user, password, database } = this.spec;
      this.setupPool = createPool({
        host,
        port,
        user,
        password,
        connectionLimit: 1,
      });
    }
    return this.setupPool;
  };

  public addPart = (...parts: PersistencePart[]) => {
    this.parts = [...this.parts, ...parts];
  };

  private runParts = async (
    context: EngineContext
  ): Promise<RunPartsResponse> => {
    const start = Date.now();
    const responses = await Promise.all(
      this.parts.map((part) => part.run(context))
    );
    const duration = Date.now() - start;
    const errors = responses
      .filter((response) => response.error)
      .map((response) => response.error);
    return errors.length ? { duration, errors } : { duration };
  };

  private run = async (context: EngineContext) => {
    this.running = true;
    this.lap = this.lap + 1;
    const result = await this.runParts(context);
    if (result.errors && result.errors.length) {
      this.errors.push({ lap: this.lap, errors: result.errors });
    }
    this.durations.total = this.durations.total + result.duration;
    this.running = false;
  };

  private waitAndCheckRunning = (delay: number): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(this.running);
      }, delay);
    });
  };

  public start = async (): Promise<void> => {
    if (this.shouldRun) {
      return;
    }
    await this.getDatabasePool().query("SELECT NOW()");
    this.lastStartedAt = Date.now();
    this.shouldRun = true;
    return;
  };

  public stop = async (): Promise<void> => {
    this.shouldRun = false;
    if (!this.running) {
      return;
    }
    // wait 5 seconds
    let stillRunning = await this.waitAndCheckRunning(5000);
    if (!stillRunning) {
      return;
    }
    // wait 10 seconds
    stillRunning = await this.waitAndCheckRunning(10000);
    if (!stillRunning) {
      return;
    }
    throw new Error("Waited 15 seconds, but persistence parts still run.");
  };

  public disconnect = async () => {
    console.log(
      "Disconnecting from Maria Db would cause errors when building new pools..."
    );
    if (this.setupPool) {
      // cannot do this: await this.setupPool.end();
    }
    if (this.databasePool) {
      // cannot do this: await this.databasePool.end();
    }
  };

  public status = async () => {
    return {
      lastStartedAt: this.lastStartedAt,
      lastLapEndAt: this.lastLapEndAt,
      running: this.running || this.shouldRun,
      duration: { laps: this.lap, consumed: { ...this.durations } },
      errors: this.errors,
    };
  };

  public settings = async () => {
    return {
      lapDuration: -1,
    };
  };

  public getSerializable = async (): Promise<SerializableEngine> => {
    const settings = await this.settings();
    const key = this.engineId;
    const actions = {};
    return { key, settings, actions };
  };
}
