import type { RpcChannel } from '../rpc/channel/RpcChannel.mjs';
import type { ResponseSuccessFrame } from '../rpc/Rpc.mjs';
import type ShellyLocalDevice from '../../drivers/local/device.mjs';
import type { ComponentMethod, NameSpace } from './components/Shelly/ListMethods.mjs';
import type { ShellyLocalListDeviceProperties } from '../../drivers/local/driver.mjs';
import type { ShellyGetComponentsResponseComponent } from './components/Shelly/GetComponents.mjs';
import type { RecursivePartial } from '../util.mjs';

export class Service {}

export type AllowedPrimitives = number | string | null;

type ComponentSetConfigParams<Config extends object> = {
  config: RecursivePartial<Omit<Config, 'id'>, AllowedPrimitives>;
};

type ComponentSetConfigResponse = {
  restart_required: boolean;
};

export abstract class Component<Status extends object, Config extends object> {
  device: ShellyLocalDevice;
  status: Status;
  config: Config;
  abstract readonly namespace: NameSpace;

  constructor(device: ShellyLocalDevice, status: Status, config: Config) {
    this.device = device;
    this.status = status;
    this.config = config;
  }

  abstract SetConfig(
    channel: RpcChannel,
    params: ComponentSetConfigParams<Config>,
  ): Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  abstract GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<Config>>;

  abstract GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<Status>>;

  abstract register(methods: ComponentMethod<NameSpace>[]): Promise<void>;

  abstract updateStatus(status: Status): Promise<void>;

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

  static createDevices(
    id: string,
    component: ShellyGetComponentsResponseComponent,
    devices: Map<string, ShellyLocalListDeviceProperties>,
  ): Map<string, ShellyLocalListDeviceProperties> {
    const mainDevice: ShellyLocalListDeviceProperties = devices.get(id)!;
    mainDevice.store.components.push(component.key);
    return devices;
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

  static createDevices(
    id: string,
    component: ShellyGetComponentsResponseComponent,
    devices: Map<string, ShellyLocalListDeviceProperties>,
  ): Map<string, ShellyLocalListDeviceProperties> {
    const mainDevice: ShellyLocalListDeviceProperties = devices.get(id)!;
    const [, componentId] = component.key.split(':') as [string, `${number}`];

    const subdeviceId = `${id}:${component.key}`;
    const subdevice: ShellyLocalListDeviceProperties = devices.get(subdeviceId) ?? {
      name: `${mainDevice.name} - ${this.uiName} ${parseInt(componentId) + 1}`,
      data: {
        id: subdeviceId,
        parent: id,
      },
      store: {
        ...mainDevice.store,
        components: [],
      },
    };
    subdevice.store.components.push(component.key);

    devices.set(subdeviceId, subdevice);
    return devices;
  }
}
