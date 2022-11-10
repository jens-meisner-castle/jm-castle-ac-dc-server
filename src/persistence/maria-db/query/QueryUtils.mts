import { PersistentRow } from "jm-castle-ac-dc-types";

export interface Filter_LoggedAt_FromTo_Seconds {
  logged_at_from: number;
  logged_at_to: number;
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
