import { Persistence } from "../../persistence/Types.mjs";
import { SerializableEngine } from "../../Types.mjs";
import { ControlContext } from "../ControlContext.mjs";
import { EngineContext } from "../EngineContext.mjs";
import {
  ControlContextConsumer,
  Engine,
  EngineContextConsumer,
} from "../Types.mjs";
import { PersistPart } from "./Types.mjs";

export interface RunPartsResponse {
  // milliseconds of duration to run all parts
  duration: number;
  errors?: string[];
}

export interface PersistEngineProps {
  engineId: string;
  persistences: Record<string, Persistence>;
  parts?: {
    onEngineContext?: PersistPart<EngineContext>[];
    onControlContext?: PersistPart<ControlContext>[];
  };
}

export class PersistEngine
  implements Engine, EngineContextConsumer, ControlContextConsumer
{
  constructor(props: PersistEngineProps) {
    const { parts, persistences, engineId } = props;
    this.engineId = engineId;
    this.persistences = persistences;
    parts &&
      parts.onEngineContext &&
      parts.onEngineContext.length &&
      this.parts.onEngineContext.push(...parts.onEngineContext);
    parts &&
      parts.onControlContext &&
      parts.onControlContext.length &&
      this.parts.onControlContext.push(...parts.onControlContext);
    return this;
  }
  private engineId: string;
  private persistences: Record<string, Persistence>;
  private lastStartedAt: number | undefined;
  private lastLapEndAt: number | undefined;
  private running = false;
  private shouldRun = false;
  private lap = 0;
  private durations = { total: 0, lapStart: 0, lapEnd: 0 };
  private errors: { lap: number; errors: string[] }[] = [];
  private parts: {
    onEngineContext: PersistPart<EngineContext>[];
    onControlContext: PersistPart<ControlContext>[];
  } = { onEngineContext: [], onControlContext: [] };

  private runPartsOnEngineContext = async (
    context: EngineContext
  ): Promise<RunPartsResponse> => {
    const start = Date.now();
    const responses = await Promise.all(
      this.parts.onEngineContext.map((part) => part.run(context))
    );
    const duration = Date.now() - start;
    const errors = responses
      .filter((response) => response.error)
      .map((response) => response.error);
    return errors.length ? { duration, errors } : { duration };
  };

  private runPartsOnControlContext = async (
    context: ControlContext
  ): Promise<RunPartsResponse> => {
    const start = Date.now();
    const responses = await Promise.all(
      this.parts.onControlContext.map((part) => part.run(context))
    );
    const duration = Date.now() - start;
    const errors = responses
      .filter((response) => response.error)
      .map((response) => response.error);
    return errors.length ? { duration, errors } : { duration };
  };

  private lapEnd = async () => {
    const end = Date.now();
    this.lastLapEndAt = end;
    return { duration: 0 };
  };

  private runOnEngineContext = async (context: EngineContext) => {
    this.running = true;
    this.lap = this.lap + 1;
    const result = await this.runPartsOnEngineContext(context);
    if (result.errors && result.errors.length) {
      this.errors.push({ lap: this.lap, errors: result.errors });
    }
    const { duration: endDuration } = await this.lapEnd();
    this.durations.total = this.durations.total + result.duration + endDuration;
    this.running = false;
  };

  private runOnControlContext = async (context: ControlContext) => {
    this.running = true;
    this.lap = this.lap + 1;
    const result = await this.runPartsOnControlContext(context);
    if (result.errors && result.errors.length) {
      this.errors.push({ lap: this.lap, errors: result.errors });
    }
    const { duration: endDuration } = await this.lapEnd();
    this.durations.total = this.durations.total + result.duration + endDuration;
    this.running = false;
  };

  public onContextChange = async (context: EngineContext) => {
    if (!this.shouldRun) {
      return;
    }
    await this.runOnEngineContext(context);
  };

  public onControlContextChange = async (context: ControlContext) => {
    if (!this.shouldRun) {
      return;
    }
    await this.runOnControlContext(context);
  };

  private waitAndCheckRunning = (delay: number): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(this.running);
      }, delay);
    });
  };

  public start = async (): Promise<void> => {
    if (this.shouldRun) {
      return;
    }
    this.lastStartedAt = Date.now();
    this.shouldRun = true;
    return;
  };
  public stop = async (): Promise<void> => {
    this.shouldRun = false;
    if (!this.running) {
      return;
    }
    // wait 5 seconds
    let stillRunning = await this.waitAndCheckRunning(5000);
    if (!stillRunning) {
      return;
    }
    // wait 10 seconds
    stillRunning = await this.waitAndCheckRunning(10000);
    if (!stillRunning) {
      return;
    }
    throw new Error("Waited 15 seconds, but persist parts still run.");
  };

  public status = async () => {
    return {
      lastStartedAt: this.lastStartedAt,
      lastLapEndAt: this.lastLapEndAt,
      running: this.running || this.shouldRun,
      duration: { laps: this.lap, consumed: { ...this.durations } },
      errors: this.errors,
    };
  };

  public settings = async () => {
    return {
      lapDuration: -1,
    };
  };

  public getSerializable = async (): Promise<SerializableEngine> => {
    const settings = await this.settings();
    const key = this.engineId;
    const actions = {};
    return { key, settings, actions };
  };
}
