import { SerializableEngine } from "jm-castle-ac-dc-types/dist/All.mjs";
import { EngineContext } from "../EngineContext.mjs";
import { Datacollector, Engine, EngineContextConsumer } from "../Types.mjs";
import { DatacollectorEvent, DatacollectorPart } from "./Types.mjs";

export interface RunPartsResponse {
  // milliseconds of duration to run all parts
  duration: number;
  errors?: string[];
}

export interface DatacollectorEngineProps {
  // every lapDuration milliseconds run all parts
  lapDuration: number;
  onEvent?: boolean;
  engineId: string;
}

export class DatacollectorEngine implements Engine, Datacollector {
  constructor(props: DatacollectorEngineProps) {
    const { engineId } = props;
    this.engineId = engineId;
    this.props = props;
    return this;
  }

  private engineId: string;
  private lastStartedAt: number | undefined;
  private lastLapEndAt: number | undefined;
  private props: DatacollectorEngineProps;
  private running = false;
  private shouldRun = false;
  private lap = 0;
  private durations = { total: 0, lapStart: 0, lapEnd: 0 };
  private errors: { lap: number; errors: string[] }[] = [];
  private parts: DatacollectorPart[] = [];
  private consumers: Record<DatacollectorEvent, EngineContextConsumer[]> = {
    lapStart: [],
    lapEnd: [],
  };

  public onLapStart = (consumer: EngineContextConsumer) => {
    const existing = this.consumers.lapStart.find((c) => c === consumer);
    if (!existing) {
      this.consumers.lapStart.push(consumer);
    }
  };

  public onLapEnd = (consumer: EngineContextConsumer) => {
    const existing = this.consumers.lapEnd.find((c) => c === consumer);
    if (!existing) {
      this.consumers.lapEnd.push(consumer);
    }
  };

  public addPart = (...parts: DatacollectorPart[]) => {
    this.parts = [...this.parts, ...parts];
  };

  private runParts = async (
    context: EngineContext
  ): Promise<RunPartsResponse> => {
    const start = Date.now();
    const responses = await Promise.all(
      this.parts.map((part) => part.run(context))
    );
    const duration = Date.now() - start;
    const errors = responses
      .filter((response) => response.error)
      .map((response) => response.error);
    return errors.length ? { duration, errors } : { duration };
  };

  /** Wait until the delay is over or when this should stop. */
  private waitForNextLap = async (delay: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
  };

  private lapStart = async (context: EngineContext) => {
    const start = Date.now();
    this.lap = this.lap + 1;
    const contextForConsumers = context.copy();
    // the first consumer is the first one which receives the context change
    const consumers = [...this.consumers.lapStart].reverse();
    while (consumers.length) {
      const current = consumers.pop();
      await current.onContextChange(contextForConsumers);
    }
    const duration = Math.max(Date.now() - start, 0);
    this.durations.lapStart = this.durations.lapStart + duration;
    return { start, duration };
  };

  private lapEnd = async (context: EngineContext) => {
    const start = Date.now();
    if (context.hasAnyData()) {
      const contextForConsumers = context.copy();
      // the first consumer is the first one which receives the context change
      const consumers = [...this.consumers.lapEnd].reverse();
      while (consumers.length) {
        const current = consumers.pop();
        await current.onContextChange(contextForConsumers);
      }
    }
    const end = Date.now();
    this.lastLapEndAt = end;
    const duration = Math.max(end - start, 0);
    this.durations.lapEnd = this.durations.lapEnd + duration;
    return { end, duration };
  };

  private run = async () => {
    this.running = true;
    const context = new EngineContext({});
    while (this.shouldRun) {
      const { start, duration: startDuration } = await this.lapStart(context);
      const result = await this.runParts(context);
      if (result.errors && result.errors.length) {
        this.errors.push({ lap: this.lap, errors: result.errors });
      }
      const { end, duration: endDuration } = await this.lapEnd(context);
      this.durations.total =
        this.durations.total + result.duration + startDuration + endDuration;
      const delay = Math.max(this.props.lapDuration - (end - start), 1000);
      await this.waitForNextLap(delay);
    }
    this.running = false;
  };

  private runOnEvent = async (context: EngineContext) => {
    if (this.shouldRun) {
      this.running = true;
      const { duration: startDuration } = await this.lapStart(context);
      const { duration: endDuration } = await this.lapEnd(context);
      this.durations.total = this.durations.total + startDuration + endDuration;
      this.running = false;
    }
  };

  private waitAndCheckRunning = (delay: number): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(this.running);
      }, delay);
    });
  };

  public start = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (this.running) {
        resolve();
      } else {
        this.lastStartedAt = Date.now();
        this.shouldRun = true;
        if (this.props.lapDuration > 0) {
          setTimeout(() => this.run(), 1);
        }
        if (this.props.onEvent) {
          this.parts.forEach(
            (part) =>
              part.onEvent && part.onEvent({ onContextChange: this.runOnEvent })
          );
        }
        resolve();
      }
    });
  };
  public stop = async (): Promise<void> => {
    if (!this.running) {
      return;
    }
    this.shouldRun = false;
    // wait a lap (max. 5 seconds)
    let stillRunning = await this.waitAndCheckRunning(
      Math.min(this.props.lapDuration, 5000)
    );
    if (!stillRunning) {
      return;
    }
    // wait a whole lap
    stillRunning = await this.waitAndCheckRunning(this.props.lapDuration);
    if (!stillRunning) {
      return;
    }
    return;
  };

  public status = async () => {
    return {
      lastStartedAt: this.lastStartedAt,
      lastLapEndAt: this.lastLapEndAt,
      running: this.running,
      duration: { laps: this.lap, consumed: { ...this.durations } },
      errors: this.errors,
    };
  };

  public settings = async () => {
    return {
      lapDuration: this.props.lapDuration,
    };
  };

  public getSerializable = async (): Promise<SerializableEngine> => {
    const settings = await this.settings();
    const key = this.engineId;
    const actions = {};
    return { key, settings, actions };
  };
}
