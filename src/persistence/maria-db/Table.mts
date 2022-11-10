import { Table } from "jm-castle-ac-dc-types";
import { MariaDbClient } from "./MariaDb.mjs";

/**  [ {
    TABLE_CATALOG: 'def',
    TABLE_SCHEMA: 'castle_ac_dc',
    TABLE_NAME: 'datapoint_log',
    COLUMN_NAME: 'dataset_id',
    ORDINAL_POSITION: 1n,
    COLUMN_DEFAULT: null,
    IS_NULLABLE: 'NO',
    DATA_TYPE: 'bigint',
    CHARACTER_MAXIMUM_LENGTH: null,
    CHARACTER_OCTET_LENGTH: null,
    NUMERIC_PRECISION: 19n,
    NUMERIC_SCALE: 0n,
    DATETIME_PRECISION: null,
    CHARACTER_SET_NAME: null,
    COLLATION_NAME: null,
    COLUMN_TYPE: 'bigint(20)',
    COLUMN_KEY: 'PRI',
    EXTRA: 'auto_increment',
    PRIVILEGES: 'select,insert,update,references',
    COLUMN_COMMENT: '',
    IS_GENERATED: 'NEVER',
    GENERATION_EXPRESSION: null
  }, {...}] */
export const columns = async (table: Table, client: MariaDbClient) => {
  try {
    const response: any = await client
      .getSetupPool()
      .query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${client.getDatabaseName()}' AND TABLE_NAME='${
          table.id
        }'`
      );
    return { result: response.map((row: any) => ({ name: row.COLUMN_NAME })) };
  } catch (error) {
    return { error: error.toString() };
  }
};
