import type { RpcChannel } from '../rpc/channel/RpcChannel.mjs';
import type { ResponseSuccessFrame } from '../rpc/Rpc.mjs';

export class Service {}

type ComponentSetConfigParams<Config extends { id: number }> = {
  config: Partial<Omit<Config, 'id'>>;
};

type ComponentSetConfigResponse = {
  restart_required: boolean;
};

export abstract class Component<Status extends object, Config extends { id: number }> {
  status: Status;
  config: Config;

  protected abstract _SetConfig: (
    channel: RpcChannel,
    id: number,
    params: ComponentSetConfigParams<Config>,
  ) => Promise<ResponseSuccessFrame<ComponentSetConfigResponse>>;

  protected abstract _GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<Config>>;

  protected abstract _GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<Status>>;

  constructor(status: Status, config: Config) {
    this.status = status;
    this.config = config;
  }

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
