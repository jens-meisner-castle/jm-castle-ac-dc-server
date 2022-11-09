import { Table } from "jm-castle-ac-dc-types/dist/All.mjs";

export const TableDatapointControlLog: Table = {
  id: "datapoint_control_log",
  columnsFragment:
    "dataset_id INT PRIMARY KEY AUTO_INCREMENT, device_id VARCHAR(100) NOT NULL, datapoint_id VARCHAR(100) NOT NULL, value_num DECIMAL(11,2), value_string VARCHAR(1000), executed TINYINT(1), success TINYINT(1), logged_at INT, logged_at_ms SMALLINT",
};
