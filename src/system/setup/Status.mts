import {
  SystemSetupStatus,
  Table,
  TableStatus,
} from "jm-castle-ac-dc-types/dist/All.mjs";
import {
  AllTables,
  MariaDbClient,
} from "../../persistence/maria-db/MariaDb.mjs";
import { columns } from "../../persistence/maria-db/Table.mjs";
import { getCurrentSystem } from "../status/System.mjs";

export const getSystemSetupStatus = async (): Promise<SystemSetupStatus> => {
  const persistence = getCurrentSystem()?.getDefaultPersistence();
  if (!persistence) {
    throw new Error("Currently is no default persistence available.");
  }
  if (persistence.type() !== "maria-db") {
    throw new Error(
      "Currently is a a setup for a MariaDB only. The default persistence is different."
    );
  }
  const mariaClient = persistence as unknown as MariaDbClient;
  const allTables: Table[] = [...AllTables];
  const allColumns = await Promise.all(
    allTables.map((table) => columns(table, mariaClient))
  );
  const tables: Record<string, TableStatus> = {};
  allTables.forEach((table, i) => {
    tables[table.id] = {
      name: table.id,
      table: table,
      isCreated: !!allColumns[i]?.result.length,
    };
  });
  const database = { name: mariaClient.getDatabaseName(), tables };
  return { database };
};
