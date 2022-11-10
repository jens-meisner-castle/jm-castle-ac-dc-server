import { Table } from "jm-castle-ac-dc-types";

export const TableDatapointLog: Table = {
  id: "datapoint_log",
  columnsFragment:
    "dataset_id INT PRIMARY KEY AUTO_INCREMENT, datapoint_id VARCHAR(100) NOT NULL, value_num DECIMAL(11,2), value_string VARCHAR(1000), logged_at INT, logged_at_ms SMALLINT, changed_at INT, changed_at_ms SMALLINT",
};
