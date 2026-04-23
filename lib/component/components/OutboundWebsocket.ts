import { ComponentWithoutId } from '../Component.js';
import SetConfig from './OutboundWebsocket/SetConfig.js';
import GetConfig from './OutboundWebsocket/GetConfig.js';
import GetStatus from './OutboundWebsocket/GetStatus.js';
import type { ComponentMethod } from './Shelly/ListMethods.js';
import type ShellyLocalDevice from '../../local/LocalDevice.js';
import { getIp } from '../../LocalIp.js';
import { OUTBOUND_WS_PORT } from '../../config.js';
import type { VirtualDevice } from '../../VirtualDevice.js';

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

  // TODO ensure this works for BLE devices
  public async register(_methods: ComponentMethod<'Ws'>[]): Promise<void> {
    const server = `ws://${await getIp(this.device.app.homey)}:${OUTBOUND_WS_PORT}`;
    if (this.config.enable && this.config.server === server) {
      this.device.log('Outbound websocket already enabled');
      return;
    }
    this.device.log('Enabling outbound websocket...');
    // TODO enable TLS certificates
    await this.SetConfig(this.device.getChannel(), { config: { ssl_ca: '*', enable: true, server: server } });
    await this.device.reboot().catch(err => this.device.debug('Error during Outbound WS reboot:', err));
    this.device.log('Enabled outbound websocket');
  }

  public static async unregister(virtualDevice: VirtualDevice): Promise<void> {
    virtualDevice.log('Disabling outbound websocket...');
    await SetConfig(virtualDevice.getChannel(), { config: { enable: false, server: '' } }).catch(virtualDevice.error);
    virtualDevice.log('Disabled outbound websocket');
  }

  public async registerHomeyDevice(_homeyDevice: ShellyLocalDevice, _methods: ComponentMethod<'Ws'>[]): Promise<void> {}

  protected async staticallyUnregisterHomeyDevice(this: never, _homeyDevice: ShellyLocalDevice): Promise<void> {}

  public async onStatusUpdate(_homeyDevice: ShellyLocalDevice, _status: OutboundWebsocketStatus): Promise<void> {}

  public async onConfigUpdate(_homeyDevice: ShellyLocalDevice, _config: OutBoundWebsocketConfig): Promise<void> {}
}
