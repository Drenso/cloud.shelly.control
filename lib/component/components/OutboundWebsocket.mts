import { ComponentWithoutId } from '../Component.mjs';
import type { ShellyDevice } from '../../../drivers/placeholder/device.mjs';
import SetConfig from './OutboundWebsocket/SetConfig.mjs';
import GetConfig from './OutboundWebsocket/GetConfig.mjs';
import GetStatus from './OutboundWebsocket/GetStatus.mjs';

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

  async register(device: ShellyDevice): Promise<void> {
    await device.configureOutboundWebsocket(this);
  }
}
