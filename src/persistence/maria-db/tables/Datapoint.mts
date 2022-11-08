import { Table } from "../../../Types.mjs";

export const TableDatapoint: Table = {
  id: "datapoint",
  columnsFragment:
    "datapoint_id VARCHAR(100) PRIMARY KEY, name VARCHAR(100), value_unit VARCHAR(50), value_type VARCHAR(50), description VARCHAR(1000), meaning VARCHAR(100)",
};
