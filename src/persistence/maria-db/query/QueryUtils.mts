import { PersistentRow } from "jm-castle-ac-dc-types";
import { PoolConnection } from "mariadb";

export interface Filter_LoggedAt_FromTo_Seconds {
  logged_at_from: number;
  logged_at_to: number;
}

export interface Filter_NameLike {
  name: string;
}

export const valueInClause = (v: any) => {
  return typeof v !== "number" && !v
    ? "NULL"
    : typeof v === "string"
    ? `'${v}'`
    : typeof v === "boolean"
    ? v === true
      ? 1
      : 0
    : `${v.toString()}`;
};
export const valuesClause = (values: PersistentRow) => {
  return Object.keys(values)
    .map(
      (k: keyof PersistentRow, i) =>
        `${i > 0 ? "," : ""} ${k} = ${valueInClause(values[k])}`
    )
    .join("");
};

export const selectLastInsertId = async (connection: PoolConnection) => {
  const insertIdResponse: [{ "LAST_INSERT_ID()": unknown }] =
    await connection.query("SELECT LAST_INSERT_ID()");
  const lastInsertIdBigInt = insertIdResponse.length
    ? insertIdResponse[0]["LAST_INSERT_ID()"]
    : undefined;
  const lastInsertId = Number.parseInt(lastInsertIdBigInt.toString());
  return lastInsertId;
};
