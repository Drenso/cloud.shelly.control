import type ShellyLocalDevice from '../local/LocalDevice.mjs';
import type { RpcChannel } from '../rpc/channel/RpcChannel.mjs';
import type { NotificationEventParam, ResponseSuccessFrame } from '../rpc/Rpc.mjs';
import { deepAssign, fillTranslationTagsRecursively, type RecursivePartial } from '../util.mjs';
import type { VirtualDevice } from '../VirtualDevice.mjs';
import type { ComponentMethod, NameSpace } from './components/Shelly/ListMethods.mjs';
import type { JsonObject } from '../../types/json.mjs';

export class Service {}

export type AllowedPrimitives = number | string | null | number[] | string[];

type ComponentSetConfigParams<Config extends object> = {
  config: RecursivePartial<Omit<Config, 'id'>, AllowedPrimitives>;
};

type ComponentSetConfigResponse = {
  restart_required: boolean;
};

export abstract class Component<
  ComponentNameSpace extends NameSpace,
  Status extends object,
  Config extends object,
  Settings extends object,
> {
  public abstract readonly namespace: ComponentNameSpace;

  public constructor(
    protected device: VirtualDevice,
    public status: Status,
    public config: Config,
  ) {}

  public abstract SetConfig(
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ): Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  public abstract GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>>;

  public abstract GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>>;

  public async register(_methods: ComponentMethod<ComponentNameSpace>[]): Promise<void> {}

  public abstract registerHomeyDevice(
    homeyDevice: ShellyLocalDevice,
    methods: ComponentMethod<ComponentNameSpace>[],
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
  public static readonly uiName: string;

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

  protected async registerCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    rawCapabilityOptions: JsonObject | undefined,
  ): Promise<string> {
    const capabilityId =
      homeyDevice.componentCounts.get(this.namespace) === 1 ? homeyCapability : `${homeyCapability}.${this.id}`;
    await homeyDevice.safeAddCapability(capabilityId);
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

  protected async setCapability(
    homeyDevice: ShellyLocalDevice,
    homeyCapability: string,
    value: unknown,
  ): Promise<void> {
    const capabilityId =
      homeyDevice.componentCounts.get(this.namespace) === 1 ? homeyCapability : `${homeyCapability}.${this.id}`;
    await homeyDevice.safeSetCapability(capabilityId, value);
  }
}
