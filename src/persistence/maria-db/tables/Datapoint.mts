import { Table } from "jm-castle-types";

export const TableDatapoint: Table = {
  id: "datapoint",
  primaryKey: "PRIMARY KEY(datapoint_id)",
  columns: [
    { name: "datapoint_id", type: "varchar(100)" },
    { name: "name", type: "varchar(100)" },
    { name: "value_unit", type: "varchar(50)" },
    { name: "value_type", type: "varchar(50)" },
    { name: "description", type: "varchar(1000)" },
    { name: "meaning", type: "varchar(100)" },
  ],
};
