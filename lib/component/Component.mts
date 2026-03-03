import type ShellyLocalDevice from '../Device.mjs';
import type { RpcChannel } from '../rpc/channel/RpcChannel.mjs';
import type { ResponseSuccessFrame } from '../rpc/Rpc.mjs';
import { deepAssign, type RecursivePartial } from '../util.mjs';
import type { VirtualDevice } from '../VirtualDevice.mjs';
import type { ComponentMethod, NameSpace } from './components/Shelly/ListMethods.mjs';

export class Service {}

export type AllowedPrimitives = number | string | null;

type ComponentSetConfigParams<Config extends object> = {
  config: RecursivePartial<Omit<Config, 'id'>, AllowedPrimitives>;
};

type ComponentSetConfigResponse = {
  restart_required: boolean;
};

export abstract class Component<Status extends object, Config extends object, Settings extends object> {
  abstract readonly namespace: NameSpace;

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

  abstract onStatusUpdate(homeyDevice: ShellyLocalDevice, status: Status): Promise<void>;

  abstract onConfigUpdate(homeyDevice: ShellyLocalDevice, config: Config): Promise<void>;

  async handleSettings(homeyDevice: ShellyLocalDevice, event: SettingsEvent<Settings>): Promise<boolean> {
    return false;
  }
}

export abstract class ComponentWithoutId<
  Status extends object,
  Config extends object,
  Settings extends object,
> extends Component<Status, Config, Settings> {
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
    deepAssign(this.config, params.config as Config);
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

export abstract class ComponentWithId<
  Status extends object,
  Config extends { id: number },
  Settings extends object,
> extends Component<Status, Config, Settings> {
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
    deepAssign(this.config, params.config as Config);
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
