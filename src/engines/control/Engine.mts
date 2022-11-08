import { CastleAcDc } from "../../system/status/System.mjs";
import {
  ActionSpec,
  DeviceControlResponse,
  EngineControlResponse,
  SerializableEngine,
} from "../../Types.mjs";
import { ControlContext } from "../ControlContext.mjs";
import { EngineContext } from "../EngineContext.mjs";
import { Control, ControlContextConsumer, Engine } from "../Types.mjs";
import { ControlEvent, ControlPart, ControlPartRunResponse } from "./Types.mjs";

export interface RunPartsResponse {
  // milliseconds of duration to run all parts
  duration: number;
  errors?: string[];
}

export interface ControlEngineProps {
  engineId: string;
  parts: ControlPart[];
  actions: Record<string, ActionSpec>;
}

export class ControlEngine implements Engine, Control {
  constructor(props: ControlEngineProps) {
    const { parts, engineId, actions } = props;
    this.engineId = engineId;
    this.actions = actions;
    this.controlHistory = new ControlContext(this.engineId);
    parts && this.parts.push(...parts);
    return this;
  }
  private actions: Record<string, ActionSpec>;
  private engineId: string;
  private controlHistory: ControlContext;
  private lastStartedAt: number | undefined;
  private lastLapEndAt: number | undefined;
  private running = false;
  private shouldRun = false;
  private lap = 0;
  private durations = { total: 0, lapStart: 0, lapEnd: 0 };
  private errors: { lap: number; errors: string[] }[] = [];
  private parts: ControlPart[] = [];
  private consumers: Record<ControlEvent, ControlContextConsumer[]> = {
    lapEnd: [],
    historyChange: [],
  };

  public getSerializable = async (): Promise<SerializableEngine> => {
    const settings = await this.settings();
    const key = this.engineId;
    const actions = this.actions;
    return { key, settings, actions };
  };

  public getSerializableControlHistory = () =>
    this.controlHistory.getSerializable();

  public getControlHistoryCopy = () => this.controlHistory.copy();

  public onLapEnd = (consumer: ControlContextConsumer) => {
    const existing = this.consumers.lapEnd.find((c) => c === consumer);
    if (!existing) {
      this.consumers.lapEnd.push(consumer);
    }
  };

  public onHistoryChange = (consumer: ControlContextConsumer) => {
    const existing = this.consumers.historyChange.find((c) => c === consumer);
    if (!existing) {
      this.consumers.historyChange.push(consumer);
    }
  };

  public removeOnHistoryChange = (consumer: ControlContextConsumer) => {
    const existing = this.consumers.historyChange.find((c) => c === consumer);
    if (existing) {
      this.consumers.historyChange = this.consumers.historyChange.filter(
        (c) => c !== existing
      );
    }
  };

  public addPart = (...parts: ControlPart[]) => {
    this.parts = [...this.parts, ...parts];
  };

  private lapStart = async () => {
    this.lap = this.lap + 1;
  };

  public consumeAction = async (
    actionId: string,
    context: EngineContext,
    system: CastleAcDc
  ): Promise<EngineControlResponse> => {
    const spec = this.actions[actionId];
    if (spec) {
      this.running = true;
      await this.lapStart();
      const control = new ControlContext(this.engineId);
      const partsResult = await this.runPartsOnAction(
        spec,
        context,
        control,
        system
      );
      const lapEndControlResults =
        await this.executeDeviceControlRequestsOnLapEnd(control, system);
      const allErrors: string[] = [];
      if (partsResult.errors && partsResult.errors.length) {
        allErrors.push(...partsResult.errors);
      }
      allErrors.push(
        ...lapEndControlResults
          .filter((result) => result.error)
          .map((result) => result.error)
      );
      if (allErrors.length) {
        this.errors.push({ lap: this.lap, errors: allErrors });
      }
      const hasChanged = this.controlHistory.addContentFrom(control);
      if (hasChanged && this.consumers.historyChange.length) {
        const contextForConsumers = this.getControlHistoryCopy();
        // the first consumer is the first one which receives the context change
        const consumers = [...this.consumers.historyChange].reverse();
        while (consumers.length) {
          const current = consumers.pop();
          await current.onControlContextChange(contextForConsumers);
        }
      }
      const { duration: endDuration } = await this.lapEnd(context, control);
      this.durations.total =
        this.durations.total + partsResult.duration + endDuration;
      this.running = false;
      return allErrors.length
        ? { success: false, error: allErrors.join(" / ") }
        : { success: true };
    }
    return {
      success: false,
      error: `The specified actionId ${actionId} is not defined within this engine ${this.engineId}`,
    };
  };

  private runParts = async (
    context: EngineContext,
    control: ControlContext,
    system: CastleAcDc
  ): Promise<RunPartsResponse> => {
    const start = Date.now();
    const results: ControlPartRunResponse[] = [];
    // currently empty
    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i];
      const runResponse = await part.run(context, control);
      const requestsPartEnd = control.resetDatapointTargetsPartial("part-end");
      if (runResponse.success) {
        let success = true;
        let error: string | undefined = undefined;
        const immediately = Object.entries(requestsPartEnd);
        for (let i = 0; i < immediately.length; i++) {
          const [deviceId, perDevice] = immediately[i];
          const controlResponse = await system.executeDeviceControlRequest(
            deviceId,
            perDevice
          );
          control.addExecutedRequest({
            deviceId,
            request: perDevice,
            success: controlResponse.success,
            error: controlResponse.error,
          });
          if (!controlResponse.success) {
            success = false;
            error = controlResponse.error;
          }
        }
        if (success) {
          results.push({ success: true });
        } else {
          results.push({ success: false, error });
        }
      } else {
        results.push({
          success: false,
          error: `Received error on run part: ${runResponse.error}`,
        });
      }
    }
    const duration = Date.now() - start;
    const errors = results
      .filter((result) => result.error)
      .map((result) => result.error);
    return errors.length ? { duration, errors } : { duration };
  };

  private runPartsOnAction = async (
    actionSpec: ActionSpec,
    context: EngineContext,
    control: ControlContext,
    system: CastleAcDc
  ): Promise<RunPartsResponse> => {
    const start = Date.now();
    const results: ControlPartRunResponse[] = [];
    // currently empty
    for (let i = 0; i < this.parts.length; i++) {
      const part = this.parts[i];
      if (part.runForAction) {
        const runResponse = await part.runForAction(
          actionSpec,
          context,
          control
        );
        const requestsPartEnd =
          control.resetDatapointTargetsPartial("part-end");
        if (runResponse.success) {
          let success = true;
          let error: string | undefined = undefined;
          const immediately = Object.entries(requestsPartEnd);
          for (let i = 0; i < immediately.length; i++) {
            const [deviceId, perDevice] = immediately[i];
            const controlResponse = await system.executeDeviceControlRequest(
              deviceId,
              perDevice
            );
            control.addExecutedRequest({
              deviceId,
              request: perDevice,
              success: controlResponse.success,
              error: controlResponse.error,
            });
            if (!controlResponse.success) {
              success = false;
              error = controlResponse.error;
            }
          }
          if (success) {
            results.push({ success: true });
          } else {
            results.push({ success: false, error });
          }
        } else {
          results.push({
            success: false,
            error: `Received error on run part: ${runResponse.error}`,
          });
        }
      }
    }
    const duration = Date.now() - start;
    const errors = results
      .filter((result) => result.error)
      .map((result) => result.error);
    return errors.length ? { duration, errors } : { duration };
  };

  private lapEnd = async (context: EngineContext, control: ControlContext) => {
    const start = Date.now();
    const contextForConsumers = control.copy();
    // the first consumer is the first one which receives the context change
    const consumers = [...this.consumers.lapEnd].reverse();
    while (consumers.length) {
      const current = consumers.pop();
      await current.onControlContextChange(contextForConsumers);
    }
    const end = Date.now();
    this.lastLapEndAt = end;
    const duration = Math.max(end - start, 0);
    this.durations.lapEnd = this.durations.lapEnd + duration;
    return { end, duration };
  };

  private executeDeviceControlRequestsOnLapEnd = async (
    control: ControlContext,
    system: CastleAcDc
  ) => {
    const results: DeviceControlResponse[] = [];
    const requestsLapEnd = control.resetDatapointTargetsPartial("lap-end");
    const immediately = Object.entries(requestsLapEnd);
    for (let i = 0; i < immediately.length; i++) {
      const [deviceId, perDevice] = immediately[i];
      const controlResponse = await system.executeDeviceControlRequest(
        deviceId,
        perDevice
      );
      control.addExecutedRequest({
        deviceId,
        request: perDevice,
        success: controlResponse.success,
        error: controlResponse.error,
      });
      results.push(controlResponse);
    }
    return results;
  };

  private run = async (
    context: EngineContext,
    control: ControlContext,
    system: CastleAcDc
  ) => {
    this.running = true;
    await this.lapStart();
    const partsResult = await this.runParts(context, control, system);
    const lapEndControlResults =
      await this.executeDeviceControlRequestsOnLapEnd(control, system);
    const allErrors: string[] = [];
    if (partsResult.errors && partsResult.errors.length) {
      allErrors.push(...partsResult.errors);
    }
    allErrors.push(
      ...lapEndControlResults
        .filter((result) => result.error)
        .map((result) => result.error)
    );
    if (allErrors.length) {
      this.errors.push({ lap: this.lap, errors: allErrors });
    }
    const hasChanged = this.controlHistory.addContentFrom(control);
    if (hasChanged && this.consumers.historyChange.length) {
      const contextForConsumers = this.getControlHistoryCopy();
      // the first consumer is the first one which receives the context change
      const consumers = [...this.consumers.historyChange].reverse();
      while (consumers.length) {
        const current = consumers.pop();
        await current.onControlContextChange(contextForConsumers);
      }
    }
    const { duration: endDuration } = await this.lapEnd(context, control);
    this.durations.total =
      this.durations.total + partsResult.duration + endDuration;
    this.running = false;
  };

  public onContextChange = async (
    context: EngineContext,
    system: CastleAcDc
  ) => {
    if (!this.shouldRun) {
      return;
    }
    const control = new ControlContext(this.engineId);
    await this.run(context, control, system);
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
}
