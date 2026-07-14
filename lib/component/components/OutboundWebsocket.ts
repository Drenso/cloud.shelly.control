import { ComponentWithoutId } from '../Component.js';
import SetConfig from './OutboundWebsocket/SetConfig.js';
import GetConfig from './OutboundWebsocket/GetConfig.js';
import GetStatus from './OutboundWebsocket/GetStatus.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';

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

export type OutboundWebsocketHomeySettings = Record<string, never>;

/**
 * The Outbound Webscoket component makes it possible to configure a Gen2+ Shelly device to establish and maintain an outbound websocket connection.
 * An RPC channel is available over said connection, supporting all features of inbound WS and MQTT channels,
 * along with unsolicited complete status notifications on connection.
 */
export default class OutboundWebsocket extends ComponentWithoutId<
  'Ws',
  OutboundWebsocketStatus,
  OutBoundWebsocketConfig,
  OutboundWebsocketHomeySettings
> {
  protected readonly _SetConfig = SetConfig;
  protected readonly _GetConfig = GetConfig;
  protected readonly _GetStatus = GetStatus;
  public readonly namespace = 'Ws';
  public static readonly uiName = 'Outbound Websocket';

  public async registerHomeyDevice(_homeyDevice: ShellyLocalDevice, _methods: ComponentMethod<'Ws'>[]): Promise<void> {}

  protected async staticallyUnregisterHomeyDevice(this: never, _homeyDevice: ShellyLocalDevice): Promise<void> {}

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: OutboundWebsocketStatus): Promise<void> {}

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: OutBoundWebsocketConfig): Promise<void> {}
}
