import { SerializableEngine } from "jm-castle-ac-dc-types";
import { EngineContext } from "../EngineContext.mjs";
import { Datastate, Engine, EngineContextConsumer } from "../Types.mjs";
import { DatastateEvent, DatastatePart } from "./Types.mjs";

export interface RunPartsResponse {
  // milliseconds of duration to run all parts
  duration: number;
  errors?: string[];
}

export interface DatastateEngineProps {
  parts: DatastatePart[];
  engineId: string;
}

export class DatastateEngine
  implements Engine, Datastate, EngineContextConsumer
{
  constructor(props: DatastateEngineProps) {
    const { parts, engineId } = props;
    this.engineId = engineId;
    parts && this.parts.push(...parts);
    return this;
  }
  private engineId: string;
  private currentState: EngineContext = new EngineContext({});
  private lastStartedAt: number | undefined;
  private lastLapEndAt: number | undefined;
  private running = false;
  private shouldRun = false;
  private lap = 0;
  private durations = { total: 0, lapStart: 0, lapEnd: 0 };
  private errors: { lap: number; errors: string[] }[] = [];
  private parts: DatastatePart[] = [];
  private consumers: Record<DatastateEvent, EngineContextConsumer[]> = {
    lapEnd: [],
  };

  public getCurrentState = async (): Promise<EngineContext> =>
    this.currentState;

  public onLapEnd = (consumer: EngineContextConsumer) => {
    const existing = this.consumers.lapEnd.find((c) => c === consumer);
    if (!existing) {
      this.consumers.lapEnd.push(consumer);
    }
  };

  public removeOnLapEnd = (consumer: EngineContextConsumer) => {
    const existing = this.consumers.lapEnd.find((c) => c === consumer);
    if (existing) {
      this.consumers.lapEnd = this.consumers.lapEnd.filter(
        (c) => c !== existing
      );
    }
  };

  public addPart = (...parts: DatastatePart[]) => {
    this.parts = [...this.parts, ...parts];
  };

  private runParts = async (
    newContext: EngineContext
  ): Promise<RunPartsResponse> => {
    const start = Date.now();
    const responses = await Promise.all(
      this.parts.map((part) => part.run(this.currentState))
    );
    const duration = Date.now() - start;
    const errors = responses
      .filter((response) => response.error)
      .map((response) => response.error);
    return errors.length ? { duration, errors } : { duration };
  };

  private lapStart = async (newContext: EngineContext) => {
    this.lap = this.lap + 1;
  };

  private lapEnd = async (newContext: EngineContext) => {
    const start = Date.now();
    // the first consumer is the first one which receives the context change
    const consumers = [...this.consumers.lapEnd].reverse();
    const consumerContext = this.currentState.copyWithNews(newContext);
    while (consumers.length) {
      const current = consumers.pop();
      await current.onContextChange(consumerContext);
    }
    const end = Date.now();
    this.lastLapEndAt = end;
    const duration = Math.max(end - start, 0);
    this.durations.lapEnd = this.durations.lapEnd + duration;
    return { end, duration };
  };

  private run = async (newContext: EngineContext) => {
    this.running = true;
    this.currentState.mergeUpdates(newContext);
    await this.lapStart(newContext);
    const result = await this.runParts(newContext);
    if (result.errors && result.errors.length) {
      this.errors.push({ lap: this.lap, errors: result.errors });
    }
    const { duration: endDuration } = await this.lapEnd(newContext);
    this.durations.total = this.durations.total + result.duration + endDuration;
    this.running = false;
  };

  public onContextChange = async (context: EngineContext) => {
    if (!this.shouldRun) {
      return;
    }
    await this.run(context);
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
    throw new Error("Waited 15 seconds, but datastate parts still run.");
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
