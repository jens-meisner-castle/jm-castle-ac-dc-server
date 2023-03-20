import { Row_DatapointControlLog as Row } from "jm-castle-ac-dc-types";
import { InsertResponse, SelectResponse } from "jm-castle-types";
import { MariaDbClient } from "../MariaDb.mjs";
import { TableDatapointControlLog } from "../tables/DatapointControlLog.js";
import { Filter_LoggedAt_FromTo_Seconds, valuesClause } from "./QueryUtils.mjs";

export { Row };

const table = TableDatapointControlLog;

export const insertNow = async (
  values: Row,
  client: MariaDbClient
): Promise<InsertResponse<Row>> => {
  const now = Date.now();
  const logged_at = Math.floor(now / 1000);
  const logged_at_ms = Math.floor((now / 1000 - logged_at) * 1000);
  return insert({ ...values, logged_at, logged_at_ms }, client);
};

export const insert = async (
  values: Row,
  client: MariaDbClient
): Promise<InsertResponse<Row>> => {
  try {
    const cmd = `INSERT INTO ${table.id} SET${valuesClause(values)}`;
    const response: any = await client.getDatabasePool().query(cmd);
    const { affectedRows } = response || {};
    return { result: { cmd, affectedRows, data: values } };
  } catch (error) {
    return { error: error.toString() };
  }
};

export const select = async (
  filter: Filter_LoggedAt_FromTo_Seconds,
  client: MariaDbClient
): Promise<SelectResponse<Row>> => {
  try {
    const { logged_at_from, logged_at_to } = filter;
    const cmd = `SELECT * FROM ${table.id} WHERE logged_at BETWEEN ${logged_at_from} AND ${logged_at_to}`;
    const queryResult = await client.getDatabasePool().query(cmd);
    const rows: Row[] = [];
    queryResult.forEach((r: Row) => rows.push(r));
    return { result: { cmd, rows } };
  } catch (error) {
    return { error: error.toString() };
  }
};
