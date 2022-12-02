import {
  ControlExecutionSpec,
  DatapointState,
  DatapointTargetSpec,
  Device,
  DeviceControlResponse,
  DeviceDatapoint,
  DeviceStatus,
  LocalDatapoint,
  LocalDatapointId,
} from "jm-castle-ac-dc-types";
import { EngineContextConsumer } from "../engines/Types.mjs";
import { DeviceType, supportedDeviceTypes } from "./DeviceTypes.mjs";

interface DatapointIdMapping {
  "local-private-to-local-public": Record<LocalDatapointId, LocalDatapointId>;
  "local-public-to-local-private": Record<LocalDatapointId, LocalDatapointId>;
  "global-public-to-local-private": Record<string, LocalDatapointId>;
}

export const getAllPublicControlDatapoints = (
  validDevices: Record<string, Device>
) => {
  const all: { __global: Record<string, DeviceDatapoint> } & Record<
    string,
    Record<string, DeviceDatapoint>
  > = { __global: {} };
  Object.entries(validDevices).forEach(([k, device]) => {
    const { type } = device;
    const deviceType = supportedDeviceTypes[type];
    const { publicControlDatapoints } = getControlDatapoints(
      device,
      deviceType
    );
    const entries = Object.entries(publicControlDatapoints);
    if (entries.length) all[device.id] = {};
    entries.forEach(([k, datapoint]) => {
      all.__global[datapoint.id] = datapoint;
      all[device.id][datapoint.localId] = datapoint;
    });
  });
  return all;
};

export const getDeviceDatapoints = (device: Device, deviceType: DeviceType) => {
  const privateDatapoints: Record<LocalDatapointId, LocalDatapoint> = {};
  const publicDatapoints: Record<LocalDatapointId, DeviceDatapoint> = {};
  const localPrivateToPublicMap: Record<LocalDatapointId, LocalDatapointId> =
    {};
  const localPublicToLocalPrivateMap: Record<
    LocalDatapointId,
    LocalDatapointId
  > = {};
  const globalPublicToLocalPrivateMap: Record<string, LocalDatapointId> = {};

  if (device.datapoints) {
    const points = device.datapoints;
    Object.entries(points).forEach(([k, localPoint]) => {
      privateDatapoints[localPoint.localId] = { ...localPoint };
      const id = `${localPoint.localId}@${device.id}`;
      const devicePoint: DeviceDatapoint = {
        deviceId: device.id,
        id,
        ...localPoint,
      };
      publicDatapoints[devicePoint.localId] = devicePoint;
      localPrivateToPublicMap[localPoint.localId] = localPoint.localId;
      localPublicToLocalPrivateMap[devicePoint.localId] = localPoint.localId;
      globalPublicToLocalPrivateMap[devicePoint.id] = localPoint.localId;
    });
  } else {
    const points = deviceType.datapoints;
    const mapPoints = device.mapDatapoints;
    Object.entries(points).forEach(([k, localPoint]) => {
      privateDatapoints[localPoint.localId] = { ...localPoint };
      const mapping = mapPoints ? mapPoints[k] : undefined;
      const { localId, name, id } = mapping || {};
      const usedLocalId = localId || localPoint.localId;
      const nameWithDeviceId = `${localPoint.name} (${device.id})`;
      const usedName = name || nameWithDeviceId;
      const globalId = id || `${usedLocalId}@${device.id}`;
      const devicePoint: DeviceDatapoint = {
        deviceId: device.id,
        localId: usedLocalId,
        id: globalId,
        name: usedName,
        valueType: localPoint.valueType,
        valueUnit: localPoint.valueUnit,
      };
      publicDatapoints[devicePoint.localId] = devicePoint;
      localPrivateToPublicMap[localPoint.localId] = devicePoint.localId;
      localPublicToLocalPrivateMap[devicePoint.localId] = localPoint.localId;
      globalPublicToLocalPrivateMap[devicePoint.id] = localPoint.localId;
    });
  }
  return {
    publicDatapoints,
    privateDatapoints,
    mapDatapointIds: {
      "local-private-to-local-public": localPrivateToPublicMap,
      "global-public-to-local-private": globalPublicToLocalPrivateMap,
      "local-public-to-local-private": localPublicToLocalPrivateMap,
    },
  };
};

export const getControlDatapoints = (
  device: Device,
  deviceType: DeviceType
) => {
  const privateControlDatapoints: Record<LocalDatapointId, LocalDatapoint> = {};
  const publicControlDatapoints: Record<LocalDatapointId, DeviceDatapoint> = {};
  const localPrivateToPublicMap: Record<LocalDatapointId, LocalDatapointId> =
    {};
  const localPublicToLocalPrivateMap: Record<
    LocalDatapointId,
    LocalDatapointId
  > = {};
  const globalPublicToLocalPrivateMap: Record<string, LocalDatapointId> = {};

  if (device.controlDatapoints) {
    const points = device.controlDatapoints;
    Object.entries(points).forEach(([k, localPoint]) => {
      privateControlDatapoints[localPoint.localId] = { ...localPoint };
      const id = `${localPoint.localId}@${device.id}`;
      const devicePoint: DeviceDatapoint = {
        deviceId: device.id,
        id,
        ...localPoint,
      };
      publicControlDatapoints[devicePoint.localId] = devicePoint;
      localPublicToLocalPrivateMap[devicePoint.localId] = localPoint.localId;
      globalPublicToLocalPrivateMap[devicePoint.id] = localPoint.localId;
    });
  } else {
    const controlPoints = deviceType.controlDatapoints;
    const mapControlPoints = device.mapControlDatapoints;
    Object.entries(controlPoints).forEach(([k, localPoint]) => {
      privateControlDatapoints[localPoint.localId] = { ...localPoint };
      const mapping = mapControlPoints ? mapControlPoints[k] : undefined;
      const { localId, name, id } = mapping || {};
      const usedLocalId = localId || localPoint.localId;
      const nameWithDeviceId = `${localPoint.name} (${device.id})`;
      const usedName = name || nameWithDeviceId;
      const globalId = id || `${usedLocalId}@${device.id}`;
      const devicePoint: DeviceDatapoint = {
        deviceId: device.id,
        localId: usedLocalId,
        id: globalId,
        name: usedName,
        valueType: localPoint.valueType,
        valueUnit: localPoint.valueUnit,
      };
      publicControlDatapoints[devicePoint.localId] = devicePoint;
      localPrivateToPublicMap[localPoint.localId] = devicePoint.localId;
      localPublicToLocalPrivateMap[devicePoint.localId] = localPoint.localId;
      globalPublicToLocalPrivateMap[devicePoint.id] = localPoint.localId;
    });
  }
  return {
    publicControlDatapoints,
    privateControlDatapoints,
    mapControlDatapointIds: {
      "local-private-to-local-public": localPrivateToPublicMap,
      "global-public-to-local-private": globalPublicToLocalPrivateMap,
      "local-public-to-local-private": localPublicToLocalPrivateMap,
    },
  };
};

export class DeviceInstance {
  constructor(device: Device, deviceType: DeviceType) {
    this.device = device;
    this.deviceType = deviceType;
    const { publicDatapoints, mapDatapointIds } = getDeviceDatapoints(
      device,
      deviceType
    );
    this.publicDatapoints = publicDatapoints;
    this.mapDatapointIds = mapDatapointIds;
    const {
      privateControlDatapoints,
      publicControlDatapoints,
      mapControlDatapointIds,
    } = getControlDatapoints(device, deviceType);
    this.privateControlDatapoints = privateControlDatapoints;
    this.publicControlDatapoints = publicControlDatapoints;
    this.mapControlDatapointIds = mapControlDatapointIds;
    return this;
  }

  private device: Device;
  private deviceType: DeviceType;
  private mapDatapointIds: DatapointIdMapping;
  private mapControlDatapointIds: DatapointIdMapping;
  /**
   * Pro öffentlicher (also evtl. mapped) local id: DeviceDatapoint
   */
  private publicDatapoints: Record<LocalDatapointId, DeviceDatapoint> = {};
  /**
   * Pro öffentlicher (also evtl. mapped) local id: DeviceDatapoint
   */
  private publicControlDatapoints: Record<LocalDatapointId, DeviceDatapoint> =
    {};
  /**
   * Pro privater (also id wie im deviceType) local id: DeviceDatapoint
   */
  private privateControlDatapoints: Record<LocalDatapointId, LocalDatapoint> =
    {};

  public getDevice = () => this.device;

  public getDeviceType = () => this.deviceType;

  public getTypeId = () => this.deviceType.id;

  public getDeviceId = () => this.device.id;

  public getPublicDatapointForPrivateLocalId = (id: string) => {
    const publicLocalId =
      this.mapDatapointIds["local-private-to-local-public"][id];
    return this.publicDatapoints[publicLocalId];
  };

  public getPublicDatapointForPublicLocalId = (id: string) => {
    return this.publicDatapoints[id];
  };

  public getPublicDatapointForPublicGlobalId = (id: string) => {
    const publicLocalId =
      this.mapDatapointIds["local-private-to-local-public"][
        this.mapDatapointIds["global-public-to-local-private"][id]
      ];
    return this.publicDatapoints[publicLocalId];
  };

  public getPublicControlDatapointForPublicLocalId = (id: string) => {
    return this.publicControlDatapoints[id];
  };

  public getPublicControlDatapointForPublicGlobalId = (id: string) => {
    const publicLocalId =
      this.mapControlDatapointIds["local-private-to-local-public"][
        this.mapControlDatapointIds["global-public-to-local-private"][id]
      ];
    return this.publicControlDatapoints[publicLocalId];
  };

  public getPublicDatapoints = () => {
    return { ...this.publicDatapoints };
  };

  public addDeviceEventConsumer = (consumer: EngineContextConsumer) => {
    if (this.deviceType.addDeviceEventConsumer) {
      this.deviceType.addDeviceEventConsumer(consumer, this.device);
    }
  };

  public fetchDeviceStatus = async (): Promise<DeviceStatus> => {
    const status = await this.deviceType.fetchStatus(this);
    const { datapoints: states, error, responsive, accessedAt } = status;
    const mappedDatapoints: Record<string, DatapointState> = {};
    states &&
      Object.entries(states).forEach(([k, state]) => {
        const datapoint = this.getPublicDatapointForPrivateLocalId(k);
        const mappedKey = datapoint ? datapoint.id : k;
        mappedDatapoints[mappedKey] = { ...state, id: mappedKey };
      });
    return { error, responsive, accessedAt, datapoints: mappedDatapoints };
  };

  public executeControlRequest = async (
    targets: Record<
      string,
      {
        target: DatapointTargetSpec;
        state: DatapointState;
      } & ControlExecutionSpec
    >
  ): Promise<DeviceControlResponse> => {
    if (!this.deviceType.executeControlRequest) {
      return {
        success: false,
        error: `The device type ${this.deviceType.id} can not be controlled.`,
      };
    }
    const localDatapointStates: DatapointState[] = [];
    Object.entries(targets).forEach(([k, pair]) => {
      const { state, target } = pair;
      const { datapoint } = target;
      const localDatapointId =
        this.mapControlDatapointIds["global-public-to-local-private"][
          datapoint
        ] ||
        this.mapControlDatapointIds["local-public-to-local-private"][datapoint];
      localDatapointId &&
        localDatapointStates.push({ ...state, id: localDatapointId });
    });
    return this.deviceType.executeControlRequest(
      this.device,
      localDatapointStates
    );
  };
}
