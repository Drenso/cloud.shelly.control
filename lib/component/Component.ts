import type ShellyLocalDevice from '../local/LocalDevice.js';
import type { RpcChannel } from '../rpc/channel/RpcChannel.js';
import type { NotificationEventParam, ResponseSuccessFrame } from '../rpc/Rpc.js';
import { safeAddCapability, safeRemoveCapability, safeSetCapabilityValue } from '../safeFunctions.js';
import { deepAssign, fillTranslationTagsRecursively, type RecursivePartial } from '../util.js';
import type { VirtualDevice } from '../VirtualDevice.js';
import type { ComponentMethod, NameSpace } from './components/Shelly/ListMethods.js';
import type { JsonObject } from '../../types/json.js';

export class Service {}

export type AllowedPrimitives = number | string | null | number[] | string[];

type ComponentSetConfigParams<Config extends object> = {
  config: RecursivePartial<Omit<Config, 'id'>, AllowedPrimitives>;
};

type ComponentSetConfigResponse = {
  restart_required: boolean;
};

export type VirtualComponentAttributes = {
  owner: string;
  role: string;
};

export abstract class Component<
  ComponentNameSpace extends NameSpace,
  Status extends object,
  Config extends object,
  Settings extends object,
> {
  public abstract readonly namespace: ComponentNameSpace;
  public static readonly uiName: string;

  public constructor(
    protected device: VirtualDevice,
    public status: Status,
    public config: Config,
    public attrs: undefined | VirtualComponentAttributes,
  ) {}

  public abstract SetConfig(
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ): Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  public abstract GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>>;

  public abstract GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>>;

  public abstract registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    methods: ComponentMethod<ComponentNameSpace>[],
  ): Promise<void>;

  public async setInitialValues(homeyDevice: ShellyLocalDevice): Promise<void> {
    // Set initial capability values
    await this.onStatusUpdate(homeyDevice, this.status);
    // Set initial setting values
    await this.onConfigUpdate(homeyDevice, this.config);
  }

  public async updateStatus(homeyDevice: ShellyLocalDevice, status: Status): Promise<void> {
    deepAssign(this.status, status);
    await this.onStatusUpdate(homeyDevice, status);
  }

  public static async unregisterHomeyDevice(homeyDevice: ShellyLocalDevice, id?: number): Promise<void> {
    // @ts-expect-error We are using this hack to make a static abstract method, so the 'this' context won't match
    await this.prototype.staticallyUnregisterHomeyDevice(homeyDevice, id);
  }

  public abstract unregisterHomeyDevice(homeyDevice: ShellyLocalDevice): Promise<void>;

  // This method should only be called statically, so no 'this'
  protected abstract staticallyUnregisterHomeyDevice(
    this: never,
    homeyDevice: ShellyLocalDevice,
    id: number | undefined,
  ): Promise<void>;

  public abstract onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Status): Promise<void>;

  public abstract onConfigUpdate(homeyDevice: ShellyLocalDevice, config: Config): Promise<void>;

  public async handleSettings(_homeyDevice: ShellyLocalDevice, _event: SettingsEvent<Settings>): Promise<boolean> {
    return false;
  }

  public async handleEvent(event: NotificationEventParam): Promise<void> {
    this.device.log(`Unknown event for ${this.namespace}:`, event.event);
    this.device.debug(JSON.stringify(event));
  }
}

export abstract class ComponentWithoutId<
  ComponentNameSpace extends NameSpace,
  Status extends object,
  Config extends object,
  Settings extends object,
> extends Component<ComponentNameSpace, Status, Config, Settings> {
  protected abstract _SetConfig: (
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ) => Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  protected abstract _GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>>;

  protected abstract _GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>>;

  public async unregisterHomeyDevice(homeyDevice: ShellyLocalDevice): Promise<void> {
    await this.staticallyUnregisterHomeyDevice.call(undefined as never, homeyDevice);
  }

  // This method should only be called statically, so no 'this'
  protected abstract staticallyUnregisterHomeyDevice(this: never, _homeyDevice: ShellyLocalDevice): Promise<void>;

  public async SetConfig(
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ): Promise<ResponseSuccessFrame<ComponentSetConfigResponse>> {
    const response = await this._SetConfig(channel, params);
    deepAssign(this.config, params.config as Config);
    return response;
  }

  public async GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>> {
    const response = await this._GetConfig(channel);
    this.config = response.result;
    return response;
  }

  public async GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>> {
    const response = await this._GetStatus(channel);
    this.status = response.result;
    return response;
  }
}

export abstract class ComponentWithId<
  ComponentNameSpace extends NameSpace,
  Status extends object,
  Config extends { id: number; name: string | null },
  Settings extends object,
> extends Component<ComponentNameSpace, Status, Config, Settings> {
  protected abstract _SetConfig: (
    channel: RpcChannel,
    id: number,
    params: ComponentSetConfigParams<Config>,
  ) => Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  protected abstract _GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<Config>>;

  protected abstract _GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<Status>>;

  public get id(): number {
    return this.config.id;
  }

  public async unregisterHomeyDevice(homeyDevice: ShellyLocalDevice): Promise<void> {
    await this.staticallyUnregisterHomeyDevice.call(undefined as never, homeyDevice, this.id);
  }

  // This method should only be called statically, so no 'this'
  protected abstract staticallyUnregisterHomeyDevice(
    this: never,
    _homeyDevice: ShellyLocalDevice,
    _id: number,
  ): Promise<void>;

  public async SetConfig(
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ): Promise<ResponseSuccessFrame<ComponentSetConfigResponse>> {
    const response = await this._SetConfig(channel, this.id, params);
    deepAssign(this.config, params.config as Config);
    return response;
  }

  public async GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>> {
    const response = await this._GetConfig(channel, this.id);
    this.config = response.result;
    return response;
  }

  public async GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>> {
    const response = await this._GetStatus(channel, this.id);
    this.status = response.result;
    return response;
  }

  public async registerCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    rawCapabilityOptions: JsonObject | undefined,
    capabilityListener?: Parameters<typeof homeyDevice.registerCapabilityListener>[1],
  ): Promise<string> {
    const singleComponent = homeyDevice.componentCounts.get(this.namespace) === 1;
    const capabilityId = singleComponent ? homeyCapability : `${homeyCapability}.${this.id}`;
    const unusedCapabilityId = singleComponent ? `${homeyCapability}.${this.id}` : homeyCapability;
    await safeRemoveCapability(homeyDevice, unusedCapabilityId);
    await safeAddCapability(homeyDevice, capabilityId);
    if (capabilityListener !== undefined) {
      homeyDevice.registerCapabilityListener(capabilityId, capabilityListener);
    }

    if (rawCapabilityOptions === undefined) {
      return capabilityId;
    }

    const name = this.config.name !== null ? this.config.name : `${this.id}`;
    const capabilityOptions = fillTranslationTagsRecursively(rawCapabilityOptions, {
      name: name,
    }) as JsonObject;
    await homeyDevice.setCapabilityOptions(capabilityId, capabilityOptions);
    return capabilityId;
  }

  public static async unregisterCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    id: number,
  ): Promise<void> {
    const multipleCapabilityId = `${homeyCapability}.${id}`;
    await safeRemoveCapability(homeyDevice, homeyCapability);
    await safeRemoveCapability(homeyDevice, multipleCapabilityId);
    await homeyDevice.setCapabilityOptions(homeyCapability, {}).catch(homeyDevice.error);
  }

  protected getCapabilityId(homeyDevice: ShellyLocalDevice, homeyCapability: string): string {
    return homeyDevice.componentCounts.get(this.namespace) === 1 ? homeyCapability : `${homeyCapability}.${this.id}`;
  }

  protected async setCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    value: unknown,
  ): Promise<void> {
    const capabilityId = this.getCapabilityId(homeyDevice, homeyCapability);
    await safeSetCapabilityValue(homeyDevice, capabilityId, value);
  }
}
