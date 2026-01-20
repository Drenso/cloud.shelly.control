import Homey from 'homey';
import HttpChannel from '../../lib/rpc/channel/HttpChannel.mjs';
import Shelly from '../../lib/component/components/Shelly.mjs';
import { ComponentMapping, type MappedComponent } from '../../lib/component/ComponentMapping.mjs';
import type { RpcChannel } from '../../lib/rpc/channel/RpcChannel.mjs';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.mjs';
import type OutboundWebsocket from '../../lib/component/components/OutboundWebsocket.mjs';
import { RpcError } from '../../lib/rpc/RpcError.mjs';
import { getIp } from '../../lib/LocalIp.mjs';
import InboundWebsocketChannel from '../../lib/rpc/channel/InboundWebsocketChannel.mjs';
import { OUTBOUND_WS_PORT } from '../../lib/config.mjs';
import OutboundWebsocketChannel from '../../lib/rpc/channel/OutboundWebsocketChannel.mjs';
import type ShellyApp from '../../app.mjs';

export default class ShellyLocalDevice extends Homey.Device {
  private httpChannel!: HttpChannel;
  private inboundWsChannel!: InboundWebsocketChannel;
  private outboundWsChannel!: OutboundWebsocketChannel;

  private registered: InstanceType<MappedComponent>[] = [];

  getChannel(): RpcChannel {
    return this.httpChannel;
  }

  // Called after onInit
  async onAdded(): Promise<void> {
    // await this.initialize();
  }

  async initialize(): Promise<void> {
    const components: ShellyGetComponentsResponseComponent[] = [];
    while (true) {
      const componentsResponse = await Shelly.GetComponents(this.httpChannel, { offset: components.length });
      components.push(...componentsResponse.result.components);
      if (components.length >= componentsResponse.result.total) {
        break;
      }
    }

    for (const component of components) {
      const [componentName, componentId] = component.key.split(':') as [string, `${number}` | undefined];
      // @ts-expect-error TS definition is incorrect with behavior in practice
      const componentConstructor: MappedComponent | undefined = ComponentMapping[componentName];
      if (!componentConstructor) {
        continue;
      }
      // @ts-expect-error The status and config will always be of the type for the component
      const componentInstance = new componentConstructor(component.status, component.config);
      this.registered.push(componentInstance);
    }

    for (const component of this.registered) {
      await component.register(this).catch(this.error);
    }
  }

  async onInit(): Promise<void> {
    const { address, name } = this.getTypedStore();

    this.httpChannel = new HttpChannel(address);
    this.inboundWsChannel = new InboundWebsocketChannel(address, this.log, this.error);
    this.outboundWsChannel = new OutboundWebsocketChannel(
      name,
      (this.homey.app as ShellyApp).outboundWsMitt,
      this.log,
      this.error,
    );

    this.inboundWsChannel.registerUpdateHandler(update => {
      this.log('Inbound WS message:', update);
    });

    this.outboundWsChannel.registerUpdateHandler(update => {
      this.log('Outbound WS message:', update);
    });

    await this.initialize();

    this.log('Initialized');
  }

  async onUninit(): Promise<void> {
    this.httpChannel.disconnect();
    this.inboundWsChannel.disconnect();
    this.outboundWsChannel.disconnect();
    this.log('Uninitialized');
  }

  getTypedStore(): {
    address: string;
    port: number;
    host: string;
    name: string;
    txt: { ver: `${number}.${number}.${number}`; app: string; gen: `${number}` };
  } {
    return this.getStore();
  }

  async safeAddCapability(id: string): Promise<void> {
    if (!this.hasCapability(id)) {
      await this.addCapability(id);
    }
  }

  async safeRemoveCapability(id: string): Promise<void> {
    if (this.hasCapability(id)) {
      await this.removeCapability(id);
    }
  }

  // TODO ensure this works with all channel types
  async configureOutboundWebsocket(component: OutboundWebsocket): Promise<void> {
    const server = `ws://${await getIp(this.homey)}:${OUTBOUND_WS_PORT}`;
    if (component.config.enable && component.config.server === server) {
      this.log('Outbound websocket already enabled');
      return;
    }
    this.log('Enabling outbound websocket...');
    await component.SetConfig(this.httpChannel, { config: { enable: true, server: server } });
    await this.reboot();
  }

  // TODO ensure this works with all channel types
  async reboot(initialWaitTime = 1000, pingTime = 500): Promise<void> {
    await Shelly.Reboot(this.httpChannel, { delay_ms: initialWaitTime });
    this.log('Rebooting...');
    // Give the device time to shut down
    await new Promise(resolve => setTimeout(resolve, initialWaitTime));
    while (true) {
      try {
        await Shelly.GetDeviceInfo(this.httpChannel);
        this.log('Finished rebooting');
        return;
      } catch (e) {
        if (e instanceof RpcError && e.code === -109) {
          this.log('Still rebooting...');
          // Wait before trying again
          await new Promise(resolve => setTimeout(resolve, pingTime));
          continue;
        }
        throw e;
      }
    }
  }
}
