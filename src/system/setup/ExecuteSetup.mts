import {
  AllTables,
  MariaDbClient,
} from "../../persistence/maria-db/MariaDb.mjs";
import { ExecuteSetupResponse } from "../../Types.mjs";
import { getCurrentSystem } from "../status/System.mjs";

const getResultFromCreateTableOrDbResponse = (
  response: any | undefined
): Record<string, unknown> => {
  const { affectedRows, insertId, warningStatus } = response || {};
  const jsonStr = JSON.stringify(
    { affectedRows, insertId, warningStatus },
    (key: string, value: any) => {
      if (!key.length) {
        return value;
      }
      if (typeof value === "bigint") {
        return Number.parseInt(value.toString());
      }
      return value;
    }
  );
  return JSON.parse(jsonStr);
};

export const executeSetup = async () => {
  // Create a database
  const persistence = getCurrentSystem()?.getDefaultPersistence();
  if (!persistence) {
    throw new Error("Currently is no default persistence available.");
  }
  if (persistence.type() !== "maria-db") {
    throw new Error(
      "Currently is a a setup for a MariaDB only. The default persistence is different."
    );
  }
  const mariaClient = persistence as MariaDbClient;
  const createDbCmd = `CREATE DATABASE IF NOT EXISTS ${mariaClient.getDatabaseName()}`;
  const responseCreateDb = await mariaClient.getSetupPool().query(createDbCmd);
  const resultCreateDb = getResultFromCreateTableOrDbResponse(responseCreateDb);
  // Create the tables
  const resultCreateTables: Record<string, any> = {};
  const createTableCmds = AllTables.map(
    (table) =>
      `CREATE TABLE IF NOT EXISTS ${table.id} (${table.columnsFragment})`
  );
  const createTableResponses = await Promise.all(
    createTableCmds.map((create) => mariaClient.getDatabasePool().query(create))
  );
  AllTables.forEach((table, i) => {
    resultCreateTables[table.id] = getResultFromCreateTableOrDbResponse(
      createTableResponses[i]
    );
  });
  const response: ExecuteSetupResponse["setup"] = {
    createDb: { cmds: [createDbCmd], result: resultCreateDb },
    createTables: { cmds: createTableCmds, result: resultCreateTables },
  };
  return response;
};
