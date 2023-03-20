import { Table } from "jm-castle-types";

export const TableSample: Table = {
  id: "sample",
  primaryKey: "PRIMARY KEY(sample_id)",
  columns: [
    { name: "sample_id", type: "varchar(100)" },
    { name: "name", type: "varchar(100)" },
    { name: "description", type: "varchar(1000)" },
    { name: "length_in_ms", type: "int(11)" },
  ],
};
