import { EngineContext } from "../EngineContext.mjs";
import { EngineContextConsumer } from "../Types.mjs";

export type DatacollectorEvent = "lapStart" | "lapEnd";

export type DatacollectorPartRunResponse =
  | {
      success: false;
      error: string;
    }
  | { success: true; error?: never };

export interface DatacollectorPart {
  run: (context: EngineContext) => Promise<DatacollectorPartRunResponse>;
  onEvent?: (consumer: EngineContextConsumer) => void;
}
