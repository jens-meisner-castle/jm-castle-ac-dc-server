import { Table } from "jm-castle-types";

export const TableDatapointLog: Table = {
  id: "datapoint_log",
  primaryKey: "PRIMARY KEY(dataset_id)",
  columns: [
    { name: "dataset_id", type: "int(11)", autoIncrement: true },
    { name: "datapoint_id", type: "varchar(100)" },
    { name: "value_num", type: "decimal(11,2)" },
    { name: "value_string", type: "varchar(1000)" },
    { name: "logged_at", type: "int(11)" },
    { name: "logged_at_ms", type: "smallint(6)" },
    { name: "changed_at", type: "int(11)" },
    { name: "changed_at_ms", type: "smallint(6)" },
  ],
};
