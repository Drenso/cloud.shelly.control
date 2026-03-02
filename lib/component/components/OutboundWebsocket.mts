import { ComponentWithoutId } from '../Component.mjs';
import SetConfig from './OutboundWebsocket/SetConfig.mjs';
import GetConfig from './OutboundWebsocket/GetConfig.mjs';
import GetStatus from './OutboundWebsocket/GetStatus.mjs';
import type { ComponentMethod } from './Shelly/ListMethods.mjs';
import type ShellyLocalDevice from '../../Device.mjs';

export type OutBoundWebsocketConfig = {
  // true if websocket outbound connection is enabled, false otherwise
  enable: boolean;
  // Name of the server to which the device is connected. When prefixed with wss:// a TLS socket will be used
  server: string | null;
  // Type of the TCP sockets
  // - TLS with disabled certificate validation
  // - TLS connection verified by the user-provided CA
  // - TLS connection verified by the built-in CA bundle
  ssl_ca: '*' | 'user_ca.pem' | 'ca.pem';
};

export type OutboundWebsocketStatus = {
  // true if device is connected to a websocket outbound connection or false otherwise.
  connected: boolean;
};

export default class OutboundWebsocket extends ComponentWithoutId<OutboundWebsocketStatus, OutBoundWebsocketConfig> {
  protected _SetConfig = SetConfig;
  protected _GetConfig = GetConfig;
  protected _GetStatus = GetStatus;
  readonly namespace = 'Ws';

  async register(methods: ComponentMethod<'Ws'>[]): Promise<void> {
    await this.device.configureOutboundWebsocket(this);
  }

  async registerHomeyDevice(homeyDevice: ShellyLocalDevice, methods: ComponentMethod<'Ws'>[]): Promise<void> {}

  async updateStatus(homeyDevice: ShellyLocalDevice, status: OutboundWebsocketStatus): Promise<void> {
    this.status = { ...this.status, ...status };
  }

  async updateConfig(homeyDevice: ShellyLocalDevice, config: OutBoundWebsocketConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    // TODO update settings
  }
}
