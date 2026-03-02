import type { RpcChannel } from '../rpc/channel/RpcChannel.mjs';
import type { NotificationEventParam, ResponseSuccessFrame } from '../rpc/Rpc.mjs';
import type { ComponentMethod, NameSpace } from './components/Shelly/ListMethods.mjs';
import type { ShellyGetComponentsResponseComponent } from './components/Shelly/GetComponents.mjs';
import type { RecursivePartial } from '../util.mjs';
import type { VirtualDevice } from '../VirtualDevice.mjs';
import type ShellyLocalDevice from '../Device.mjs';
import type { ShellyLocalListDeviceProperties } from '../types.mjs';

export class Service {}

export type AllowedPrimitives = number | string | null;

type ComponentSetConfigParams<Config extends object> = {
  config: RecursivePartial<Omit<Config, 'id'>, AllowedPrimitives>;
};

type ComponentSetConfigResponse = {
  restart_required: boolean;
};

export abstract class Component<Status extends object, Config extends object> {
  abstract readonly namespace: NameSpace;

  // TODO make status and config available through readonly get
  constructor(
    protected device: VirtualDevice,
    public status: Status,
    public config: Config,
  ) {}

  abstract SetConfig(
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ): Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  abstract GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>>;

  abstract GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>>;

  abstract register(methods: ComponentMethod<NameSpace>[]): Promise<void>;

  abstract registerHomeyDevice(homeyDevice: ShellyLocalDevice, methods: ComponentMethod<NameSpace>[]): Promise<void>;

  abstract updateStatus(homeyDevice: ShellyLocalDevice, status: Status): Promise<void>;

  abstract updateConfig(homeyDevice: ShellyLocalDevice, config: Config): Promise<void>;

  // TODO update so the virtual device handles events and distributes updates to the Homey devices
  async handleEvent(homeyDevice: ShellyLocalDevice, event: NotificationEventParam): Promise<void> {
    if (event.event === 'config_changed') {
      const newConfig = await this.GetConfig(this.device.getChannel());
      await this.updateConfig(homeyDevice, newConfig.result);
    } else {
      homeyDevice.log('Unknown event:', event.event);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleSettings(homeyDevice: ShellyLocalDevice, event: SettingsEvent<any>): Promise<void | string> {}

  static readonly createDevices: (
    id: string,
    component: ShellyGetComponentsResponseComponent,
    devices: Map<string, ShellyLocalListDeviceProperties>,
  ) => Map<string, ShellyLocalListDeviceProperties>;
}

export abstract class ComponentWithoutId<Status extends object, Config extends object> extends Component<
  Status,
  Config
> {
  protected abstract _SetConfig: (
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ) => Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  protected abstract _GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>>;

  protected abstract _GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>>;

  async SetConfig(
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ): Promise<ResponseSuccessFrame<ComponentSetConfigResponse>> {
    const response = await this._SetConfig(channel, params);
    this.config = { ...this.config, ...params.config };
    return response;
  }

  async GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>> {
    const response = await this._GetConfig(channel);
    this.config = response.result;
    return response;
  }

  async GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>> {
    const response = await this._GetStatus(channel);
    this.status = response.result;
    return response;
  }
}

export abstract class ComponentWithId<Status extends object, Config extends { id: number }> extends Component<
  Status,
  Config
> {
  static uiName: string;

  protected abstract _SetConfig: (
    channel: RpcChannel,
    id: number,
    params: ComponentSetConfigParams<Config>,
  ) => Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  protected abstract _GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<Config>>;

  protected abstract _GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<Status>>;

  get id(): number {
    return this.config.id;
  }

  async SetConfig(
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ): Promise<ResponseSuccessFrame<ComponentSetConfigResponse>> {
    const response = await this._SetConfig(channel, this.id, params);
    this.config = { ...this.config, ...params.config };
    return response;
  }

  async GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>> {
    const response = await this._GetConfig(channel, this.id);
    this.config = response.result;
    return response;
  }

  async GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>> {
    const response = await this._GetStatus(channel, this.id);
    this.status = response.result;
    return response;
  }
}
