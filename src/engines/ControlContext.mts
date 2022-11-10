import {
  ControlExecutionSpec,
  DatapointState,
  DatapointTargets,
  DatapointTargetSpec,
  DeviceControlRequest,
  SerializableControlContext,
} from "jm-castle-ac-dc-types";

export class ControlContext {
  constructor(
    engineId: string,
    executedRequests?: {
      deviceId: string;
      request: DeviceControlRequest;
      success: boolean;
      error?: string;
    }[],
    datapointTargets?: DatapointTargets
  ) {
    this.engineId = engineId;
    datapointTargets && Object.assign(this.datapointTargets, datapointTargets);
    executedRequests && (this.executedRequests = executedRequests);
    return this;
  }
  private engineId: string;
  private datapointTargets: DatapointTargets = {};
  private executedRequests: {
    deviceId: string;
    request: DeviceControlRequest;
    success: boolean;
    error?: string;
  }[] = [];

  public getSerializable = (): SerializableControlContext => ({
    engineId: this.engineId,
    executedRequests: [...this.executedRequests],
    datapointTargets: { ...this.datapointTargets },
  });

  public getEngineId = () => this.engineId;

  public copy = () => {
    return new ControlContext(this.engineId, [...this.executedRequests], {
      ...this.datapointTargets,
    });
  };

  /**
   *
   * @param context the newly context
   * @returns true, if the new context has any content
   */
  public addContentFrom = (context: ControlContext, maxSize = 10) => {
    if (
      context.executedRequests.length ||
      Object.keys(context.datapointTargets).length
    ) {
      this.executedRequests.push(...context.executedRequests);
      this.datapointTargets = {
        ...this.datapointTargets,
        ...context.datapointTargets,
      };
      if (this.executedRequests.length > maxSize) {
        this.executedRequests = this.executedRequests.slice(-maxSize);
      }
      return true;
    }
    return false;
  };

  public addExecutedRequest = (executed: {
    deviceId: string;
    request: DeviceControlRequest;
    success: boolean;
    error?: string;
  }) => {
    this.executedRequests.push(executed);
  };

  public setDatapointTarget = (
    target: DatapointTargetSpec,
    state: DatapointState,
    when: ControlExecutionSpec["when"]
  ) => {
    let perDevice = this.datapointTargets[target.device];
    if (!perDevice) {
      perDevice = {};
      this.datapointTargets[target.device] = perDevice;
    }
    perDevice[target.datapoint] = { target, state, when };
  };

  public getExecutedRequests = (deviceId: string, datapointId: string) => {
    const executed: { state: DatapointState; success: boolean }[] = [];
    this.executedRequests.forEach((exe) => {
      const { request, success, deviceId: executedOnDeviceId } = exe;
      if (executedOnDeviceId === deviceId) {
        Object.entries(request).forEach(([k, value]) => {
          const { target, state } = value;
          if (target.datapoint === datapointId) {
            executed.push({ state, success });
          }
        });
      }
    });
    return executed;
  };

  public getDatapointTarget = (device: string, datapoint: string) => {
    const perDevice = this.datapointTargets[device];
    return perDevice ? perDevice[datapoint] : undefined;
  };

  public resetDatapointTargets = () => {
    const datapoints = { ...this.datapointTargets };
    this.datapointTargets = {};
    return datapoints;
  };

  public resetDatapointTargetsPartial = (
    ...whenArr: ControlExecutionSpec["when"][]
  ) => {
    const datapoints = { ...this.datapointTargets };
    const toReset: typeof this.datapointTargets = {};
    const toStay: typeof this.datapointTargets = {};
    Object.entries(datapoints).forEach(([deviceId, perDevice]) => {
      const perDeviceToStay: typeof perDevice = {};
      const perDeviceToReset: typeof perDevice = {};
      Object.entries(perDevice).forEach(([k, request]) => {
        const { when } = request;
        if (whenArr.includes(when)) {
          perDeviceToReset[k] = request;
        } else {
          perDeviceToStay[k] = request;
        }
      });
      if (Object.keys(perDeviceToStay).length) {
        toStay[deviceId] = perDeviceToStay;
      }
      if (Object.keys(perDeviceToReset).length) {
        toReset[deviceId] = perDeviceToReset;
      }
    });
    this.datapointTargets = toStay;
    return toReset;
  };
}
