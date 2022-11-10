import {
  CheckedConfiguration,
  Configuration,
  ControlExecutionSpec,
  ControlPersistTargetSpec,
  ControlstateContent,
  Datapoint,
  DatapointSequence,
  DatapointState,
  DatapointTargetSpec,
  DatastateContent,
  Device,
  DeviceControlResponse,
  DeviceDatapoint,
  DeviceStatus,
  DurationUnits,
  EngineControlResponse,
  EngineSpec,
  isDurationUnit,
  MailingSpec,
  PersistenceAreas,
  PersistenceSpec,
  SequenceConditionChangeAspects,
  SequenceState,
  SimulationPreviewResponse,
  StatePersistTargetSpec,
  SystemSpec,
  SystemStatus,
  UniqueDatapoint,
  ValueTypes,
} from "jm-castle-ac-dc-types";
import { DateTime } from "luxon";
import {
  configFilePath,
  readJsonFile,
} from "../../configuration/Configuration.mjs";
import {
  DeviceInstance,
  getAllPublicControlDatapoints,
  getDeviceDatapoints,
} from "../../devices/DeviceInstance.mjs";
import {
  DeviceType,
  isSimulation,
  supportedDeviceTypes,
} from "../../devices/DeviceTypes.mjs";
import { getPreviewForSimulation } from "../../devices/simulation/Status.mjs";
import { PreviewOptions } from "../../devices/simulation/Types.mjs";
import { ControlEngine } from "../../engines/control/Engine.mjs";
import { ControlPart } from "../../engines/control/Types.mjs";
import { ControlContext } from "../../engines/ControlContext.mjs";
import { supportedControlPartTypes } from "../../engines/ControlPartTypes.mjs";
import { DatacollectorEngine } from "../../engines/data-collector/Engine.mjs";
import { DatastateEngine } from "../../engines/data-state/Engine.mjs";
import { DatapointCalculator } from "../../engines/data-state/parts/DatapointCalculator.mjs";
import { DatapointMapper } from "../../engines/data-state/parts/DatapointMapper.mjs";
import { DatapointSequencer } from "../../engines/data-state/parts/DatapointSequencer.mjs";
import {
  DefaultStatePart,
  getDefaultDatapoints,
} from "../../engines/data-state/parts/DefaultStatePart.mjs";
import { EngineContext } from "../../engines/EngineContext.mjs";
import { PersistEngine } from "../../engines/persist/Engine.mjs";
import { PersistPart } from "../../engines/persist/Types.mjs";
import {
  ControlContextConsumer,
  Datacollector,
  Engine,
  EngineContextConsumer,
  isSystemEngineKey,
  SystemEngineKey_datastate,
} from "../../engines/Types.mjs";
import { getMailSender } from "../../mail/Mail.mjs";
import { MailSender } from "../../mail/Types.mjs";
import { getPersistence } from "../../persistence/Persistence.mjs";
import { Persistence } from "../../persistence/Types.mjs";
import { getDateFormat } from "../../utils/Format.mjs";

let CurrentSystem: CastleAcDc | undefined = undefined;

export const setCurrentSystem = (system: CastleAcDc) => {
  CurrentSystem = system;
};

export const getCurrentSystem = () => CurrentSystem;

export class CastleAcDc {
  constructor(configuration: Configuration) {
    const { validConfig, errors } = this.checkConfiguration(configuration);
    this.configuration = {
      ...configuration,
      isValid: !errors || !errors.length,
    };
    this.validConfig = validConfig;
    this.systemName = validConfig.system?.name || "no name";
    this.configErrors = errors;
    errors && console.error(...errors);
  }
  private systemName: string;
  private startedAt = Date.now();
  private configuration: CheckedConfiguration;
  private configErrors: string[] | undefined;
  private validConfig: CheckedConfiguration;

  private persistence: Record<string, Persistence & Engine> = {};
  private defaultPersistence: (Persistence & Engine) | undefined = undefined;
  private mailSenders: Record<string, MailSender> = {};
  private defaultMailSender: MailSender | undefined = undefined;
  private datastate: DatastateEngine;
  private devices: Record<
    string,
    { device: Device; deviceType: DeviceType; deviceInstance: DeviceInstance }
  > = {};
  private datacollectors: Record<string, Datacollector> = {};
  private controls: Record<string, ControlEngine> = {};
  private engines: Record<string, Engine> = {};

  public start = async () => {
    await this.setupMailSenders();
    if (this.defaultMailSender) {
      const config = JSON.stringify(this.configuration);
      try {
        await this.defaultMailSender.send(
          `starting ${
            this.validConfig.system?.name || "castle-ac-dc"
          } at ${DateTime.now().toFormat(getDateFormat("second"))}`,
          JSON.stringify({ config: { length: config.length } })
        );
      } catch (error) {
        console.error(error);
      }
    }
    await this.setupPersistence();
    await this.setupDevices();
    await this.setupEngines();
    await this.executeAutoStarts();
  };

  private disconnectFromAllDevices = async () => {
    const deviceKeys = Object.keys(this.devices);
    for (let i = 0; i < deviceKeys.length; i++) {
      const k = deviceKeys[i];
      const deviceAccess = this.devices[k];
      await deviceAccess.deviceType.disconnectFromDevice(
        deviceAccess.deviceInstance
      );
    }
  };

  private disconnectFromAllPersistences = async () => {
    const persistenceKeys = Object.keys(this.persistence);
    for (let i = 0; i < persistenceKeys.length; i++) {
      const k = persistenceKeys[i];
      const persistence = this.persistence[k];
      await persistence.disconnect();
    }
  };

  private disconnectFromAllMailSenders = async () => {
    const mailSenderKeys = Object.keys(this.mailSenders);
    for (let i = 0; i < mailSenderKeys.length; i++) {
      const k = mailSenderKeys[i];
      const mailSender = this.mailSenders[k];
      await mailSender.disconnect();
    }
  };

  /**
   * Stop all engines and remove all
   * Disconnect from all devices and remove all
   * Set empty datastate
   * Disconnect all persistences and remove all
   * Disconnect all mail senders and remove all
   * Start again
   */
  public restart = async () => {
    await this.executeStopAll();
    this.engines = {};
    this.datacollectors = {};
    this.controls = {};
    await this.disconnectFromAllDevices();
    this.devices = {};
    this.datastate = new DatastateEngine({
      engineId: SystemEngineKey_datastate,
      parts: [],
    });
    await this.disconnectFromAllPersistences();
    this.persistence = {};
    this.defaultPersistence = undefined;
    await this.disconnectFromAllMailSenders();
    this.mailSenders = {};
    this.defaultMailSender = undefined;
    const filePath = configFilePath();
    console.log("reading config from file:", filePath);
    const configuration = readJsonFile<Configuration>(filePath);
    const newSystem = new CastleAcDc(configuration);
    setCurrentSystem(newSystem);
    await newSystem.start();
  };

  private executeAutoStarts = async () => {
    // autoStart: persists => controls => state => datacollectors
    console.log(
      "devices... \n" +
        Object.keys(this.devices)
          .map((k) => this.devices[k].device.id)
          .join(" \n")
    );
    const persistKeys = Object.keys(this.validConfig.engines).filter(
      (k) =>
        this.validConfig.engines[k].persistState ||
        this.validConfig.engines[k].persistControl
    );
    for (let i = 0; i < persistKeys.length; i++) {
      const key = persistKeys[i];
      const persistSpec = this.validConfig.engines[key];
      const engine = this.engines[key];
      const isAutoStart =
        persistSpec && engine && persistSpec.autoStart === true;
      if (isAutoStart) {
        await engine.start();
        console.log(`started persist engine "${key}"`);
      }
    }
    const controlKeys = Object.keys(this.validConfig.engines).filter(
      (k) => this.validConfig.engines[k].controls
    );
    for (let i = 0; i < controlKeys.length; i++) {
      const key = controlKeys[i];
      const controlSpec = this.validConfig.engines[key];
      const engine = this.engines[key];
      const isAutoStart =
        controlSpec && engine && controlSpec.autoStart === true;
      if (isAutoStart) {
        await engine.start();
        console.log(`started control engine "${key}"`);
      }
    }
    const stateKeys = Object.keys(this.validConfig.engines).filter(
      (k) => this.validConfig.engines[k].stateParts
    );
    for (let i = 0; i < stateKeys.length; i++) {
      const key = stateKeys[i];
      const stateSpec = this.validConfig.engines[key];
      const engine = this.engines[key];
      const isAutoStart = stateSpec && engine && stateSpec.autoStart === true;
      if (isAutoStart) {
        await engine.start();
        console.log(`started state engine "${key}"`);
      }
    }
    const collectorKeys = Object.keys(this.validConfig.engines).filter(
      (k) => this.validConfig.engines[k].collect
    );
    for (let i = 0; i < collectorKeys.length; i++) {
      const key = collectorKeys[i];
      const collectorSpec = this.validConfig.engines[key];
      const engine = this.engines[key];
      const isAutoStart =
        collectorSpec && engine && collectorSpec.autoStart === true;
      if (isAutoStart) {
        await engine.start();
        console.log(`started data collector engine "${key}"`);
      }
    }
  };

  private executeStopAll = async () => {
    // stop:  datacollectors => controls => datastate => persists
    const collectorKeys = Object.keys(this.validConfig.engines).filter(
      (k) => this.validConfig.engines[k].collect
    );
    for (let i = 0; i < collectorKeys.length; i++) {
      const key = collectorKeys[i];
      const collectorSpec = this.validConfig.engines[key];
      const engine = this.engines[key];
      const isAutoStart =
        collectorSpec && engine && collectorSpec.autoStart === true;
      if (isAutoStart) {
        await engine.start();
        console.log(`started data collector engine "${key}"`);
      }
    }
    const controlKeys = Object.keys(this.validConfig.engines).filter(
      (k) => this.validConfig.engines[k].controls
    );
    for (let i = 0; i < controlKeys.length; i++) {
      const key = controlKeys[i];
      const controlSpec = this.validConfig.engines[key];
      const engine = this.engines[key];
      const isAutoStart =
        controlSpec && engine && controlSpec.autoStart === true;
      if (isAutoStart) {
        await engine.start();
        console.log(`started control engine "${key}"`);
      }
    }
    const stateKeys = Object.keys(this.validConfig.engines).filter(
      (k) => this.validConfig.engines[k].stateParts
    );
    for (let i = 0; i < stateKeys.length; i++) {
      const key = stateKeys[i];
      const stateSpec = this.validConfig.engines[key];
      const engine = this.engines[key];
      const isAutoStart = stateSpec && engine && stateSpec.autoStart === true;
      if (isAutoStart) {
        await engine.start();
        console.log(`started state engine "${key}"`);
      }
    }
    const persistKeys = Object.keys(this.validConfig.engines).filter(
      (k) =>
        this.validConfig.engines[k].persistState ||
        this.validConfig.engines[k].persistControl
    );
    for (let i = 0; i < persistKeys.length; i++) {
      const key = persistKeys[i];
      const persistSpec = this.validConfig.engines[key];
      const engine = this.engines[key];
      const isAutoStart =
        persistSpec && engine && persistSpec.autoStart === true;
      if (isAutoStart) {
        await engine.start();
        console.log(`started persist engine "${key}"`);
      }
    }
  };

  private checkSystemSpec = (
    spec: SystemSpec,
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    const { name } = spec;
    if (name && typeof name !== "string") {
      errors.push(
        `Bad system spec: If used the property "name" must have a string as value. Found type "${typeof name}".`
      );
      return false;
    }
    validConfig.system = spec;
    return true;
  };

  private checkPersistenceSpec = (
    key: string,
    spec: PersistenceSpec,
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    const { host, database, password, port, type, user } = spec;
    if (type !== "maria-db") {
      errors.push(
        `Bad persistence ${key}: Currently is only a MariaDB possible as persistence. Found type "${type}".`
      );
      return false;
    }
    if (typeof host !== "string") {
      errors.push(
        `Bad persistence ${key}: The property "host" must be a string, but is ${typeof host}.`
      );
      return false;
    }
    if (typeof database !== "string") {
      errors.push(
        `Bad persistence ${key}: The property "database" must be a string, but is ${typeof database}.`
      );
      return false;
    }
    if (typeof password !== "string") {
      errors.push(
        `Bad persistence ${key}: The property "password" must be a string, but is ${typeof password}.`
      );
      return false;
    }
    if (typeof user !== "string") {
      errors.push(
        `Bad persistence ${key}: The property "user" must be a string, but is ${typeof user}.`
      );
      return false;
    }
    if (typeof port !== "number") {
      errors.push(
        `Bad persistence ${key}: The property "port" must be a number, but is ${typeof port}.`
      );
      return false;
    }
    validConfig.persistence[key] = spec;
    return true;
  };

  private checkMailingSpec = (
    key: string,
    spec: MailingSpec,
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    const { host, password, port, type, user } = spec;
    if (type !== "smtp") {
      errors.push(
        `Bad mailing spec ${key}: Currently is only "smtp" possible as type of mailing spec. Found type "${type}".`
      );
      return false;
    }
    if (typeof host !== "string") {
      errors.push(
        `Bad mailing spec ${key}: The property "host" must be a string, but is ${typeof host}.`
      );
      return false;
    }
    if (typeof password !== "string") {
      errors.push(
        `Bad mailing spec ${key}: The property "password" must be a string, but is ${typeof password}.`
      );
      return false;
    }
    if (typeof user !== "string") {
      errors.push(
        `Bad mailing spec ${key}: The property "user" must be a string, but is ${typeof user}.`
      );
      return false;
    }
    if (typeof port !== "number") {
      errors.push(
        `Bad mailing spec ${key}: The property "port" must be a number, but is ${typeof port}.`
      );
      return false;
    }
    validConfig.mail[key] = spec;
    return true;
  };

  private checkDatacollectorEngine = (
    key: string,
    engine: EngineSpec,
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    const { collect } = engine;
    if (isSystemEngineKey(key)) {
      errors.push(
        `Bad engine key ${key}: This key is reserved for a special system engine.`
      );
      return false;
    }
    if (!collect) {
      errors.push(
        `Bad call for key ${key}: A datacollector engine needs the property "collect".`
      );
      return false;
    }
    const { devices, lapDuration, onEvent } = collect;
    if (typeof lapDuration !== "number") {
      errors.push(
        `Bad engine ${key}: A datacollector needs a specified lapDuration. You may use "-1" to disable the polling.`
      );
      return false;
    }
    if (lapDuration !== -1 && lapDuration < 1000) {
      errors.push(
        `Bad engine ${key}: A datacollector needs a specified lapDuration in milliseconds. Choose a value of 1000 or more. You may use "-1" to disable the polling.`
      );
      return false;
    }
    if (onEvent && typeof onEvent !== "boolean") {
      errors.push(
        `Bad engine ${key}: If specified the value of "onEvent" must be a boolean.`
      );
      return false;
    }
    if (!devices) {
      errors.push(
        `Bad engine ${key}: A datacollector without any devices does not make sense.`
      );
      return false;
    }
    const localErrors: string[] = [];
    Object.keys(devices).forEach((k) => {
      const deviceRef = devices[k];
      if (!deviceRef) {
        localErrors.push(
          `Bad engine ${key}: Each value in property "devices" must be an object.`
        );
        return false;
      }
      const { datapoints } = deviceRef;
      if (!Array.isArray(datapoints)) {
        localErrors.push(
          `Bad engine ${key}: The property "datapoints" for a device within a datacollector must be an array.`
        );
        return false;
      }
      const device = validConfig.devices[k];
      if (!device) {
        localErrors.push(
          `Bad engine ${key}: The specified device ${k} is not available within the valid configuration.`
        );
        return false;
      }
      const deviceType = supportedDeviceTypes[device.type];
      const { mapDatapointIds } = getDeviceDatapoints(device, deviceType);
      datapoints.forEach((id) => {
        if (
          !mapDatapointIds["local-public-to-local-private"] &&
          !mapDatapointIds["global-public-to-local-private"][id]
        ) {
          localErrors.push(
            `Bad engine ${key}: The datapoint ${id} in device ${k} is not available. Device type ${deviceType.id}.`
          );
          return false;
        }
      });
      if (!deviceType.makeDatacollectorPart) {
        localErrors.push(
          `Bad engine ${key}: The specified device ${k} cannot be used within a datacollector. It is missing a (reliable) API.`
        );
        return false;
      }
    });
    if (localErrors.length) {
      errors.push(...localErrors);
      return false;
    }
    validConfig.engines[key] = engine;
    return true;
  };

  private checkPersistStatePart = (
    key: string,
    parts: StatePersistTargetSpec[],
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    const localErrors: string[] = [];
    parts.forEach((partSpec) => {
      const { to, datapoints, into } = partSpec;
      if (!to) {
        localErrors.push(
          `Bad engine ${key}: Each element of "persistState" needs the property "to", which is the key of a configured persistence.`
        );
        return false;
      }
      if (!(into === "datapoint-log" || into === "datapoint-control-log")) {
        localErrors.push(
          `Bad engine ${key}: Each element of "persistState" needs the property "into", which means an area (e.g. a table) of a persistence. Choose one of ${Object.keys(
            PersistenceAreas
          ).join(", ")}.`
        );
        return false;
      }
      if (!Array.isArray(datapoints)) {
        localErrors.push(
          `Bad engine ${key}: Each element of "persistState" needs the property "datapoints", which is an array of ids of Datapoints.`
        );
        return false;
      }
      const configuredPersistence = validConfig.persistence[to];
      if (!configuredPersistence) {
        localErrors.push(
          `Bad engine ${key}: The property "to" must be the key of one valid configured persistence. A valid persistence for ${to} is not available.`
        );
        return false;
      }
    });
    if (localErrors.length) {
      errors.push(...localErrors);
      return false;
    }
    return true;
  };

  private checkPersistControlPart = (
    key: string,
    parts: ControlPersistTargetSpec[],
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    const localErrors: string[] = [];
    parts.forEach((partSpec) => {
      const { to, datapoints, into } = partSpec;
      if (!to) {
        localErrors.push(
          `Bad engine ${key}: Each element of "persistControl" needs the property "to", which is the key of a configured persistence.`
        );
        return false;
      }
      if (!(into === "datapoint-control-log")) {
        localErrors.push(
          `Bad engine ${key}: Each element of "persistControl" needs the property "into", which means an area (e.g. a table) of a persistence. Choose one of ${Object.keys(
            PersistenceAreas
          ).join(", ")}.`
        );
        return false;
      }
      if (!(typeof datapoints === "object")) {
        localErrors.push(
          `Bad engine ${key}: Each element of "persistControl" needs the property "datapoints", which is an object with associations of deviceId and an array of ids of Datapoints.`
        );
        return false;
      }
      const badDatapointEntry = Object.keys(datapoints).find(
        (k) => !Array.isArray(datapoints[k])
      );
      if (badDatapointEntry) {
        localErrors.push(
          `Bad engine ${key}: Each element of "persistControl" needs the property "datapoints". Each value must be an array of ids of Datapoints.`
        );
        return false;
      }
      const configuredPersistence = validConfig.persistence[to];
      if (!configuredPersistence) {
        localErrors.push(
          `Bad engine ${key}: The property "to" must be the key of one valid configured persistence. A valid persistence for ${to} is not available.`
        );
        return false;
      }
    });
    if (localErrors.length) {
      errors.push(...localErrors);
      return false;
    }
    return true;
  };

  private checkPersistEngine = (
    key: string,
    engine: EngineSpec,
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    const { persistState, persistControl } = engine;
    if (isSystemEngineKey(key)) {
      errors.push(
        `Bad engine key ${key}: This key is reserved for a special system engine.`
      );
      return false;
    }
    if (!persistState && !persistControl) {
      errors.push(
        `Bad call for key ${key}: At least one of the properties "persistState", "persistControl" must be used.`
      );
      return false;
    }
    if (persistState) {
      if (!Array.isArray(persistState)) {
        errors.push(
          `Bad call for key ${key}: If the property "persistState" is used, the value must be an array.`
        );
        return false;
      }
      const result = this.checkPersistStatePart(
        key,
        persistState,
        validConfig,
        errors
      );
      if (!result) {
        return false;
      }
    }
    if (persistControl) {
      if (!Array.isArray(persistState)) {
        errors.push(
          `Bad call for key ${key}: If the property "persistControl" is used, the value must be an array.`
        );
        return false;
      }
      const result = this.checkPersistControlPart(
        key,
        persistControl,
        validConfig,
        errors
      );
      if (!result) {
        return false;
      }
    }
    validConfig.engines[key] = engine;
    return true;
  };

  private checkControlEngine = (
    key: string,
    engine: EngineSpec,
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    const { controls, actions } = engine;
    const allControlDatapoints = getAllPublicControlDatapoints(
      validConfig.devices
    );
    if (isSystemEngineKey(key)) {
      errors.push(
        `Bad engine key ${key}: This key is reserved for a special system engine.`
      );
      return false;
    }
    if (!controls) {
      errors.push(
        `Bad call for key ${key}: A control engine needs the property "controls".`
      );
      return false;
    }
    if (!Array.isArray(controls)) {
      errors.push(
        `Bad engine key ${key}: A control engine needs an array for property "controls".`
      );
      return false;
    }
    const localErrors: string[] = [];
    controls.forEach((controlSpec) => {
      if (typeof controlSpec !== "object") {
        localErrors.push(
          `Bad engine ${key}: Each element in property "controls" must be an object.`
        );
        return false;
      }
      const { type, input, output } = controlSpec || {};
      if (!type) {
        localErrors.push(
          `Bad engine ${key}: Each element in property "controls" must have a string as property "type". Choose one of ${Object.keys(
            supportedControlPartTypes
          ).join(", ")}.`
        );
        return false;
      }
      const controlPartType = supportedControlPartTypes[type];
      if (!controlPartType) {
        localErrors.push(
          `Bad engine ${key}: The type ${type} for an engine control part is not supported. Choose one of ${Object.keys(
            supportedControlPartTypes
          ).join(", ")}.`
        );
        return false;
      }
      if (!input || typeof input !== "object") {
        localErrors.push(
          `Bad engine ${key}: Each element in property "controls" must have an object as property "input".`
        );
        return false;
      }
      if (!output || typeof output !== "object") {
        localErrors.push(
          `Bad engine ${key}: Each element in property "controls" must have an object as property "input".`
        );
        return false;
      }
      const { result, errors } = controlPartType.checkControlPartSpec(
        controlSpec,
        actions,
        allControlDatapoints
      );
      if (!result) {
        errors.forEach((error) =>
          localErrors.push(
            `Bad engine ${key}: Control part type error: ${error}`
          )
        );
        return false;
      }
    });
    if (localErrors.length) {
      errors.push(...localErrors);
      return false;
    }
    validConfig.engines[key] = engine;
    return true;
  };

  private checkStateEngine = (
    key: string,
    engine: EngineSpec,
    validConfig: Configuration,
    errors: string[]
  ): boolean => {
    if (key !== SystemEngineKey_datastate) {
      errors.push(
        `Bad engine key ${key}: Currently you have to use "${SystemEngineKey_datastate}" to add behaviour to the system state engine.`
      );
      return false;
    }
    const { stateParts } = engine;
    if (!Array.isArray(stateParts)) {
      errors.push(
        `Bad call for key ${key}: A state engine needs an array for the property "stateParts".`
      );
      return false;
    }
    const localErrors: string[] = [];
    const badStatePart = stateParts.find((statePart) => {
      const { mapDatapoints, calculateDatapoints, sequenceDatapoints } =
        statePart;
      if (!mapDatapoints && !calculateDatapoints && !sequenceDatapoints) {
        errors.push(
          `Bad engine ${key}: A state part needs one or more of theese properties: "mapDatapoints", "calculateDatapoints", "sequenceDatapoints".`
        );
        // find bad!
        return true;
      }
      if (calculateDatapoints) {
        const badKey = Object.keys(calculateDatapoints).find((k) => {
          const spec = calculateDatapoints[k];
          if (!spec) {
            localErrors.push(
              `Bad engine ${key}: Each value in property "calculateDatapoints" must be an object.`
            );
            // find bad!
            return true;
          }
          const { name, code, valueType } = spec;
          if (!name) {
            localErrors.push(
              `Bad engine ${key}: Each calculated datapoint needs a string as "name".`
            );
            // find bad!
            return true;
          }
          if (!code) {
            localErrors.push(
              `Bad engine ${key}: Each calculated datapoint needs a string as "code".`
            );
            // find bad!
            return true;
          }
          if (!valueType) {
            localErrors.push(
              `Bad engine ${key}: Each calculated datapoint needs a valid type (one of: ${Object.keys(
                ValueTypes
              ).join(", ")}) as "valueType".`
            );
            // find bad!
            return true;
          }
        });
        return !!badKey;
      }
      if (sequenceDatapoints) {
        if (!Array.isArray(sequenceDatapoints)) {
          localErrors.push(
            `Bad engine ${key}: The value of the property "sequenceDatapoints" must be an array.`
          );
          // find bad!
          return true;
        }
        const badSequenceSpec = sequenceDatapoints.find((sequenceSpec) => {
          if (typeof sequenceSpec !== "object") {
            localErrors.push(
              `Bad engine ${key}: The value of the property "sequenceDatapoints" must be an array of objects.`
            );
            // find bad!
            return true;
          }
          const { datapointId, sequenceId, limit, condition } = sequenceSpec;
          if (typeof sequenceId !== "string") {
            localErrors.push(
              `Bad engine ${key}: Each sequence spec needs a string as "sequenceId".`
            );
            // find bad!
            return true;
          }
          if (typeof datapointId !== "string") {
            localErrors.push(
              `Bad engine ${key}: Each sequence spec needs a string as "datapointId".`
            );
            // find bad!
            return true;
          }
          if (typeof limit !== "object") {
            localErrors.push(
              `Bad engine ${key}: Each sequence spec needs an object as "limit".`
            );
            // find bad!
            return true;
          }
          const { maxCount, maxAge } = limit;
          if (typeof maxCount !== "number" && typeof maxAge !== "object") {
            localErrors.push(
              `Bad engine ${key}: Each value of property "limit" within a sequence spec needs a positive number as property "maxCount" or an object as property "maxAge".`
            );
            // find bad!
            return true;
          }
          if (typeof maxCount === "number" && maxCount < 1) {
            localErrors.push(
              `Bad engine ${key}: The property "maxCount" within a limit must be a positive number.`
            );
            // find bad!
            return true;
          }
          if (maxAge) {
            const { count, unit } = maxAge;
            if (
              typeof count !== "number" ||
              count < 1 ||
              !isDurationUnit(unit)
            ) {
              localErrors.push(
                `Bad engine ${key}: The property "maxAge" must be an object with properties "count" (= positive number) and "unit" (= one of: ${Object.keys(
                  DurationUnits
                ).join(", ")}).`
              );
              // find bad!
              return true;
            }
          }
          if (typeof condition !== "object") {
            localErrors.push(
              `Bad engine ${key}: The property "condition" within a sequence spec must be an object.`
            );
            // find bad!
            return true;
          }
          const { change } = condition;
          if (
            typeof change !== "string" ||
            !SequenceConditionChangeAspects[change]
          ) {
            localErrors.push(
              `Bad engine ${key}: The property "change" within a condition of a sequence spec must be one of: ${Object.keys(
                SequenceConditionChangeAspects
              ).join(", ")}.`
            );
            // find bad!
            return true;
          }
        });
        return !!badSequenceSpec;
      }
      // find bad!
      return false;
    });
    if (badStatePart) {
      errors.push(...localErrors);
      return false;
    }
    validConfig.engines[key] = engine;
    return true;
  };

  public checkConfiguration = (
    configuration: Configuration
  ): { validConfig: CheckedConfiguration; errors: string[] | undefined } => {
    try {
      const { devices, engines, persistence, mail, system } = configuration;
      const validConfig: CheckedConfiguration = {
        isValid: true,
        devices: {},
        engines: {},
        persistence: {},
        mail: {},
      };
      const errors: string[] = [];
      system && this.checkSystemSpec(system, validConfig, errors);
      persistence &&
        Object.keys(persistence).forEach((k) => {
          const persistenceSpec = persistence[k];
          if (!persistenceSpec) {
            errors.push(
              `Each value in property "persistence" must be a persistence specification.`
            );
          } else {
            this.checkPersistenceSpec(k, persistenceSpec, validConfig, errors);
          }
        });
      mail &&
        Object.keys(mail).forEach((k) => {
          const mailingSpec = mail[k];
          if (!mailingSpec) {
            errors.push(
              `Each value in property "mail" must be a mailing specification.`
            );
          } else {
            this.checkMailingSpec(k, mailingSpec, validConfig, errors);
          }
        });
      devices &&
        Object.keys(devices).forEach((k) => {
          const device = devices[k];
          if (!device) {
            errors.push(
              `Each value in property "devices" must be a device definition.`
            );
          } else if (k !== device.id) {
            errors.push(
              `Bad device ${k}: key and id ${device.id} must be equal.`
            );
          } else if (!supportedDeviceTypes[device.type]) {
            errors.push(
              `Bad device ${k} : type ${device.type} is not supported.`
            );
          } else {
            validConfig.devices[k] = device;
          }
        });
      engines &&
        Object.keys(engines).forEach((k) => {
          const engine = engines[k];
          const {
            collect,
            persistState,
            persistControl,
            stateParts,
            controls,
          } = engine || {};
          if (collect) {
            this.checkDatacollectorEngine(k, engine, validConfig, errors);
          } else if (persistState || persistControl) {
            this.checkPersistEngine(k, engine, validConfig, errors);
          } else if (stateParts) {
            this.checkStateEngine(k, engine, validConfig, errors);
          } else if (controls) {
            this.checkControlEngine(k, engine, validConfig, errors);
          } else {
            errors.push(
              `Bad engine ${k}: An engine needs at least one of the following properties: "collect", "persist", "mapDatapoints", calculateDatapoints", "controls"`
            );
            return false;
          }
        });
      return { validConfig, errors: errors.length ? errors : undefined };
    } catch (error) {
      return {
        validConfig: { devices: {}, engines: {}, persistence: {}, mail: {} },
        errors: [error.toString()],
      };
    }
  };

  private setupPersistence = async () => {
    Object.keys(this.validConfig.persistence).forEach((k) => {
      const persistenceSpec = this.validConfig.persistence[k];
      const { isDefault } = persistenceSpec;
      const persistence = getPersistence(k, persistenceSpec);
      this.persistence[k] = persistence;
      this.engines[k] = persistence;
      if (isDefault) {
        this.defaultPersistence = persistence;
      }
    });
  };

  private setupMailSenders = async () => {
    Object.keys(this.validConfig.mail).forEach((k) => {
      const mailingSpec = this.validConfig.mail[k];
      const { isDefault } = mailingSpec;
      const mailSender = getMailSender(mailingSpec);
      this.mailSenders[k] = mailSender;
      if (isDefault) {
        this.defaultMailSender = mailSender;
      }
    });
  };

  private setupDevices = async () => {
    Object.keys(this.validConfig.devices).forEach((k) => {
      const device = this.validConfig.devices[k];
      const deviceType = supportedDeviceTypes[device.type];
      if (device && deviceType) {
        const deviceInstance = new DeviceInstance(device, deviceType);
        this.devices[k] = { device, deviceType, deviceInstance };
      }
    });
  };

  private setupDatacollectors = async () => {
    const engines = this.validConfig.engines;
    const datacollectors = Object.keys(engines)
      .filter((k) => engines[k].collect)
      .map((k) => ({ id: k, spec: engines[k].collect }));
    for (let j = 0; j < datacollectors.length; j++) {
      const config = datacollectors[j];
      const { id, spec } = config;
      const { devices, lapDuration, onEvent } = spec;
      const datacollectorEngine = new DatacollectorEngine({
        engineId: id,
        lapDuration:
          lapDuration === -1 ? lapDuration : Math.max(lapDuration, 1000),
        onEvent,
      });
      const deviceKeys = Object.keys(devices);
      for (let i = 0; i < deviceKeys.length; i++) {
        const k = deviceKeys[i];
        const { deviceType, deviceInstance } = this.devices[k];
        const { datapoints } = devices[k];
        const datacollectorPart =
          deviceType.makeDatacollectorPart &&
          (await deviceType.makeDatacollectorPart(
            deviceInstance,
            ...datapoints
          ));
        datacollectorEngine.addPart(datacollectorPart);
      }
      this.engines[id] = datacollectorEngine;
      this.datacollectors[id] = datacollectorEngine;
    }
  };

  private setupDatastate = async () => {
    // setup datastate (at least with default part) and connect to all collectors
    const engines = this.validConfig.engines;
    const defaultPart = new DefaultStatePart(this);
    const datastate = new DatastateEngine({
      engineId: SystemEngineKey_datastate,
      parts: [defaultPart],
    });
    Object.keys(this.datacollectors).forEach((k) =>
      this.datacollectors[k].onLapEnd({
        onContextChange: datastate.onContextChange,
      })
    );
    this.datastate = datastate;
    this.engines[SystemEngineKey_datastate] = datastate;
    const statePartSpecs = Object.keys(engines)
      .filter((k) => engines[k].stateParts)
      .map((k) => ({ engineKey: k, specs: engines[k].stateParts }));
    statePartSpecs.forEach((statePart) => {
      const { specs } = statePart;
      specs.forEach((spec) => {
        const { mapDatapoints, calculateDatapoints, sequenceDatapoints } = spec;
        if (mapDatapoints) {
          const newPart = new DatapointMapper(mapDatapoints);
          datastate.addPart(newPart);
        }
        if (calculateDatapoints) {
          Object.entries(calculateDatapoints).forEach(([k, calculation]) => {
            const { code, valueType, valueUnit, name } = calculation;
            const newPart = new DatapointCalculator({
              datapointId: k,
              name,
              code,
              valueType,
              valueUnit,
            });
            datastate.addPart(newPart);
          });
        }
        if (sequenceDatapoints) {
          sequenceDatapoints.forEach((sequenceSpec) => {
            const newPart = new DatapointSequencer(sequenceSpec);
            datastate.addPart(newPart);
          });
        }
      });
    });
  };

  private setupControls = async () => {
    const engines = this.validConfig.engines;
    const controlEngineSpecs = Object.keys(engines)
      .filter((k) => engines[k].controls)
      .map((k) => ({
        id: k,
        spec: engines[k].controls,
        actions: engines[k].actions || {},
      }));
    controlEngineSpecs.forEach((config) => {
      const parts: ControlPart[] = [];
      config.spec.forEach((partSpec) => {
        const partType = supportedControlPartTypes[partSpec.type];
        const part = partType && partType.makeControlPart(partSpec);
        if (part) {
          parts.push(part);
        }
      });
      const engine = new ControlEngine({
        engineId: config.id,
        parts,
        actions: config.actions,
      });
      this.engines[config.id] = engine;
      this.controls[config.id] = engine;
      this.datastate.onLapEnd({
        onContextChange: (context) => engine.onContextChange(context, this),
      });
    });
  };

  private setupPersists = async () => {
    const engines = this.validConfig.engines;
    const persistTargetSpecs = Object.keys(engines)
      .filter((k) => engines[k].persistState || engines[k].persistControl)
      .map((k) => ({
        id: k,
        spec: {
          state: engines[k].persistState,
          control: engines[k].persistControl,
        },
      }));
    persistTargetSpecs.forEach((config) => {
      const { spec, id } = config;
      const partsOnEngineContext: PersistPart<EngineContext>[] = [];
      const partsOnControlContext: PersistPart<ControlContext>[] = [];
      const usedPersistences: Record<string, Persistence> = {};
      spec &&
        spec.state &&
        spec.state.forEach((partSpec) => {
          const { to, datapoints, into } = partSpec;
          const persistence = this.persistence[to];
          if (!persistence) {
            console.error(`Fatal error: No persistence available for "${to}".`);
          } else {
            usedPersistences[to] = persistence;
            switch (into) {
              case "datapoint-log":
                partsOnEngineContext.push(
                  persistence.datapoint_log.makePersistPart(...datapoints)
                );
                break;
            }
          }
        });
      spec &&
        spec.control &&
        spec.control.forEach((partSpec) => {
          const { to, datapoints, into } = partSpec;
          const persistence = this.persistence[to];
          if (!persistence) {
            console.error(`Fatal error: No persistence available for "${to}".`);
          } else {
            usedPersistences[to] = persistence;
            switch (into) {
              case "datapoint-control-log":
                partsOnControlContext.push(
                  persistence.datapoint_control_log.makePersistPart(datapoints)
                );
                break;
            }
          }
        });
      const persistEngine = new PersistEngine({
        engineId: id,
        parts: {
          onEngineContext: partsOnEngineContext,
          onControlContext: partsOnControlContext,
        },
        persistences: usedPersistences,
      });
      // interested in engineContext (=> datastate)
      partsOnEngineContext.length && this.datastate.onLapEnd(persistEngine);
      // interested in controlContext (=> to ALL(!) controls)
      partsOnControlContext.length &&
        Object.keys(this.controls).forEach((k) =>
          this.controls[k].onLapEnd(persistEngine)
        );
      this.engines[id] = persistEngine;
    });
  };

  private setupEngines = async () => {
    await this.setupDatacollectors();
    await this.setupDatastate();
    await this.setupControls();
    await this.setupPersists();
  };

  public getStatus = async (): Promise<SystemStatus> => {
    return {
      startedAt: this.startedAt,
      configuration: {
        content: this.configuration,
        errors: this.configErrors,
        valid: this.validConfig,
      },
    };
  };

  public getDevices = async (): Promise<
    { device: Device; datapoints: Record<string, DeviceDatapoint> }[]
  > => {
    return Object.keys(this.devices).map((k) => {
      const { device, deviceType, deviceInstance } = this.devices[k];
      return {
        device,
        datapoints: deviceInstance.getPublicDatapoints(),
      };
    });
  };

  public getEngines = async (): Promise<Record<string, Engine>> => {
    return { ...this.engines };
  };

  public getAllCollectorDatapoints = async (): Promise<
    Record<string, DeviceDatapoint>
  > => {
    const collectorPoints: Record<string, DeviceDatapoint> = {};
    const enginesArr = Object.keys(this.validConfig.engines).map((key) => ({
      key,
      engine: this.validConfig.engines[key],
    }));
    for (let i = 0; i < enginesArr.length; i++) {
      const { engine } = enginesArr[i];
      const { collect } = engine;
      if (collect) {
        const { devices } = collect;
        const deviceArr = Object.keys(devices).map((key) => ({
          key,
          device: devices[key],
        }));
        for (let i = 0; i < deviceArr.length; i++) {
          const { device, key: deviceId } = deviceArr[i];
          const { deviceInstance } = this.devices[deviceId] || {};
          const { datapoints: publicLocalOrGlobalIds } = device;
          deviceInstance &&
            publicLocalOrGlobalIds.forEach((id) => {
              const deviceDatapoint =
                deviceInstance.getPublicDatapointForPublicGlobalId(id) ||
                deviceInstance.getPublicDatapointForPublicLocalId(id);
              deviceDatapoint &&
                (collectorPoints[deviceDatapoint.id] = {
                  ...deviceDatapoint,
                });
            });
        }
      }
    }
    return collectorPoints;
  };

  public getStateDatapoints = async (): Promise<
    Record<string, UniqueDatapoint>
  > => {
    const collectorDatapoints = await this.getAllCollectorDatapoints();
    const defaultDatapoints = getDefaultDatapoints();
    const stateDatapoints: Record<string, UniqueDatapoint> = {
      ...defaultDatapoints,
      ...collectorDatapoints,
    };
    const enginesArr = Object.keys(this.validConfig.engines).map((key) => ({
      key,
      engine: this.validConfig.engines[key],
    }));
    for (let i = 0; i < enginesArr.length; i++) {
      const { engine } = enginesArr[i];
      const { stateParts } = engine;
      if (stateParts) {
        stateParts.forEach((statePart) => {
          const { mapDatapoints, calculateDatapoints } = statePart;
          if (mapDatapoints) {
            Object.keys(mapDatapoints).forEach((k) => {
              const mapTo = mapDatapoints[k];
              const collectorPoint = collectorDatapoints[k];
              if (collectorPoint) {
                const { id, name } = mapTo;
                const newName = name || collectorPoint.name;
                const mappedPoint: Datapoint = {
                  valueUnit: collectorPoint.valueUnit,
                  valueType: collectorPoint.valueType,
                  note: collectorPoint.note,
                  id,
                  name: newName,
                };
                stateDatapoints[mappedPoint.id] = mappedPoint;
              }
            });
          }
          if (calculateDatapoints) {
            Object.keys(calculateDatapoints).forEach((k) => {
              const calculation = calculateDatapoints[k];
              const { name, valueType, valueUnit } = calculation;
              stateDatapoints[k] = { id: k, name, valueType, valueUnit };
            });
          }
        });
      }
    }
    return stateDatapoints;
  };

  public getPersistentDatapoints_DatapointLog = async (): Promise<
    Record<string, UniqueDatapoint>
  > => {
    const stateDatapoints = await this.getStateDatapoints();
    const persistentDatapoints: Record<string, UniqueDatapoint> = {};
    const enginesArr = Object.keys(this.validConfig.engines).map((key) => ({
      key,
      engine: this.validConfig.engines[key],
    }));
    for (let i = 0; i < enginesArr.length; i++) {
      const { engine } = enginesArr[i];
      const { persistState } = engine;
      if (persistState) {
        persistState.forEach((partSpec) => {
          const { datapoints: datapointIds, into } = partSpec;
          switch (into) {
            case "datapoint-log":
              for (let i = 0; i < datapointIds.length; i++) {
                const statePoint = stateDatapoints[datapointIds[i]];
                if (statePoint) {
                  persistentDatapoints[statePoint.id] = statePoint;
                }
              }
              break;
          }
        });
      }
    }
    return persistentDatapoints;
  };

  public getPersistentDatapoints_DatapointControlLog = async (): Promise<
    Record<string, DeviceDatapoint>
  > => {
    const persistentDatapoints: Record<string, DeviceDatapoint> = {};
    const enginesArr = Object.keys(this.validConfig.engines).map((key) => ({
      key,
      engine: this.validConfig.engines[key],
    }));
    for (let i = 0; i < enginesArr.length; i++) {
      const { engine } = enginesArr[i];
      const { persistControl } = engine;
      if (persistControl) {
        persistControl.forEach((partSpec) => {
          const { datapoints: targets, into } = partSpec;
          switch (into) {
            case "datapoint-control-log": {
              targets &&
                Object.keys(targets).forEach((deviceId) => {
                  const publicLocalOrGlobalIds = targets[deviceId];
                  const deviceAccess = this.devices[deviceId];
                  const { deviceInstance } = deviceAccess || {};
                  deviceInstance &&
                    publicLocalOrGlobalIds.forEach((publicLocalOrGlobalId) => {
                      const deviceDatapoint =
                        deviceInstance.getPublicControlDatapointForPublicLocalId(
                          publicLocalOrGlobalId
                        ) ||
                        deviceInstance.getPublicControlDatapointForPublicGlobalId(
                          publicLocalOrGlobalId
                        );
                      if (deviceDatapoint) {
                        persistentDatapoints[deviceDatapoint.id] = {
                          ...deviceDatapoint,
                        };
                      }
                    });
                });
              break;
            }
          }
        });
      }
    }
    return persistentDatapoints;
  };

  public getPersistentDatapoints = async (
    area: keyof typeof PersistenceAreas
  ): Promise<Record<string, UniqueDatapoint>> => {
    switch (area) {
      case "datapoint-log":
        return this.getPersistentDatapoints_DatapointLog();
      case "datapoint-control-log":
        return this.getPersistentDatapoints_DatapointControlLog();
    }
  };

  public getDeviceDatapointsArray = async (
    deviceId?: string
  ): Promise<UniqueDatapoint[]> => {
    const deviceDatapoints: UniqueDatapoint[] = [];
    const deviceKeys = deviceId ? [deviceId] : Object.keys(this.devices);
    for (let i = 0; i < deviceKeys.length; i++) {
      const { deviceInstance } = this.devices[deviceKeys[i]];
      const datapoints = deviceInstance
        ? deviceInstance.getPublicDatapoints()
        : {};
      Object.entries(datapoints).forEach(([k, datapoint]) =>
        deviceDatapoints.push(datapoint)
      );
    }
    return deviceDatapoints;
  };

  public getDeviceControlDatapointsArray = async (
    deviceId?: string
  ): Promise<UniqueDatapoint[]> => {
    const device = deviceId && this.validConfig.devices[deviceId];
    const devices: Record<string, Device> = deviceId
      ? {}
      : this.validConfig.devices;
    deviceId && device && (devices[deviceId] = device);
    const datapoints = getAllPublicControlDatapoints(devices);
    const deviceDatapoints: UniqueDatapoint[] = [];
    const recordKeys = Object.keys(datapoints);
    for (let i = 0; i < recordKeys.length; i++) {
      const recordKey = recordKeys[i];
      const record = datapoints[recordKey];
      const datapointKeys = Object.keys(record);
      for (let j = 0; j < datapointKeys.length; j++) {
        const k = datapointKeys[j];
        const datapoint = record[k];
        const datapointMayBeIncluded = deviceDatapoints.find(
          (dp) => dp.id === datapoint.id
        );
        !datapointMayBeIncluded && deviceDatapoints.push(datapoint);
      }
    }
    return deviceDatapoints;
  };

  public getStateDatapointsArray = async (): Promise<UniqueDatapoint[]> => {
    const datapoints = await this.getStateDatapoints();
    return Object.keys(datapoints).map((k) => datapoints[k]);
  };

  public getPersistentDatapointsArray = async (
    area: keyof typeof PersistenceAreas
  ): Promise<UniqueDatapoint[]> => {
    const datapoints = await this.getPersistentDatapoints(area);
    return datapoints ? Object.keys(datapoints).map((k) => datapoints[k]) : [];
  };

  public consumeEngineControlAction = async (
    engineId: string,
    actionId: string
  ): Promise<EngineControlResponse> => {
    const engine = this.controls[engineId];
    if (!engine) {
      return {
        success: false,
        error: `The engine ${engineId} is not available within this system ${this.systemName}.`,
      };
    }
    const context = await this.datastate.getCurrentState();
    return await engine.consumeAction(actionId, context, this);
  };

  public addConsumerOnDatastate = (consumer: EngineContextConsumer) => {
    this.datastate.onLapEnd(consumer);
  };

  public addConsumerOnControlHistories = (consumer: ControlContextConsumer) => {
    Object.entries(this.controls).forEach(([k, engine]) => {
      engine.onHistoryChange(consumer);
    });
  };

  public removeConsumerOnDatastate = (consumer: EngineContextConsumer) => {
    this.datastate.removeOnLapEnd(consumer);
  };

  public removeConsumerOnControlHistories = (
    consumer: ControlContextConsumer
  ) => {
    Object.entries(this.controls).forEach(([k, engine]) => {
      engine.removeOnHistoryChange(consumer);
    });
  };

  public getDatastateContent = async (): Promise<DatastateContent> => {
    const datapoints: Record<string, UniqueDatapoint> =
      await this.getStateDatapoints();
    const context = (await this.datastate.getCurrentState()).copy();
    const pointsAndStates = context.resetDatapoints();
    const datapointStates: Record<string, DatapointState> = {};
    Object.keys(pointsAndStates).forEach(
      (k) => (datapointStates[k] = pointsAndStates[k].state)
    );
    const sequencesAndStates = context.resetSequences();
    const sequenceStates: Record<string, SequenceState> = {};
    const sequences: Record<string, DatapointSequence> = {};
    Object.keys(sequencesAndStates).forEach((k) => {
      sequenceStates[k] = sequencesAndStates[k].state;
      sequences[k] = sequencesAndStates[k].sequence;
    });
    return { datapoints, datapointStates, sequences, sequenceStates };
  };

  public getControlstateContent = async (): Promise<ControlstateContent> => {
    const content: ControlstateContent = { controls: {} };
    const controlKeys = Object.keys(this.controls);
    for (let i = 0; i < controlKeys.length; i++) {
      const k = controlKeys[i];
      const controlEngine = this.controls[k];
      content.controls[k] = {
        context: controlEngine.getSerializableControlHistory(),
      };
    }
    return content;
  };

  public getDeviceStatus = async (deviceId: string): Promise<DeviceStatus> => {
    const accessor = this.devices[deviceId];
    if (!accessor) {
      return {
        accessedAt: Date.now(),
        datapoints: {},
        responsive: false,
        error: `Unknwon device ${deviceId}.`,
      };
    }
    return accessor.deviceInstance.fetchDeviceStatus();
  };

  public executeDeviceControlRequest = async (
    deviceId: string,
    targets: Record<
      string,
      {
        target: DatapointTargetSpec;
        state: DatapointState;
      } & ControlExecutionSpec
    >
  ): Promise<DeviceControlResponse> => {
    const { deviceInstance } = this.devices[deviceId] || {};
    if (!deviceInstance) {
      return {
        success: false,
        error: `Bad device control request. The device ${deviceId} is not available in this system.`,
      };
    }
    const response = await deviceInstance.executeControlRequest(targets);
    return response;
  };

  public getSimulationPreview = async (
    deviceId: string,
    options?: PreviewOptions
  ): Promise<SimulationPreviewResponse> => {
    const deviceAccess = this.devices[deviceId];
    if (!deviceAccess) {
      return {
        error: `The specified device '${deviceId}' is not available.`,
      };
    }
    const deviceType = deviceAccess.deviceType.id;
    if (!isSimulation(deviceType)) {
      return {
        error: `The specified device '${deviceId}' is not a a simulation.`,
      };
    }
    return getPreviewForSimulation(deviceAccess.deviceInstance, options);
  };

  public getDefaultPersistence = () => this.defaultPersistence;
}
