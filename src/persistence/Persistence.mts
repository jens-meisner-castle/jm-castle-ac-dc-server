import { MariaDatabaseSpec } from "jm-castle-ac-dc-types";
import { Engine } from "../engines/Types.mjs";
import { MariaDbClient } from "./maria-db/MariaDb.mjs";
import { Persistence } from "./Types.mjs";

export const getPersistence = (
  engineId: string,
  spec: MariaDatabaseSpec
): Persistence & Engine => {
  return new MariaDbClient({ engineId, spec });
};
