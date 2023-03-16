import { Table } from "jm-castle-types";

export const TableDatapointControlLog: Table = {
  id: "datapoint_control_log",
  primaryKey: "PRIMARY KEY(dataset_id)",
  columns: [
    { name: "dataset_id", type: "int(11)", autoIncrement: true },
    { name: "device_id", type: "varchar(100)" },
    { name: "datapoint_id", type: "varchar(100)" },
    { name: "value_num", type: "decimal(11,2)" },
    { name: "value_string", type: "varchar(1000)" },
    { name: "executed", type: "tinyint(1)" },
    { name: "success", type: "tinyint(1)" },
    { name: "logged_at", type: "int(11)" },
    { name: "logged_at_ms", type: "smallint(6)" },
  ],
};
