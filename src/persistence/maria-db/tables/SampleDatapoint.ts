import { Table } from "jm-castle-types";

export const TableSampleDatapoint: Table = {
  id: "sample_datapoint",
  primaryKey: "PRIMARY KEY(sample_id, datapoint_id)",
  columns: [
    { name: "sample_id", type: "varchar(100)" },
    { name: "datapoint_id", type: "varchar(100)" },
    { name: "name", type: "varchar(100)" },
    { name: "value_unit", type: "varchar(50)" },
    { name: "value_type", type: "varchar(50)" },
    { name: "description", type: "varchar(1000)" },
    { name: "meaning", type: "varchar(100)" },
  ],
};
