import Homey from 'homey';
import HttpChannel from '../../lib/rpc/channel/HttpChannel.mjs';
import Shelly from '../../lib/component/components/Shelly.mjs';
import { ComponentMapping, type MappedComponent } from '../../lib/component/ComponentMapping.mjs';
import type { RpcChannel } from '../../lib/rpc/channel/RpcChannel.mjs';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.mjs';
import type OutboundWebsocket from '../../lib/component/components/OutboundWebsocket.mjs';
import { RpcError } from '../../lib/rpc/RpcError.mjs';
import { getIp } from '../../lib/LocalIp.mjs';
import InboundWebsocket from '../../lib/rpc/channel/InboundWebsocket.mjs';
import { OUTBOUND_WS_PORT } from '../../lib/config.mjs';

export abstract class ShellyDevice extends Homey.Device {
  abstract getChannel(): RpcChannel;

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

  async configureOutboundWebsocket(component: OutboundWebsocket): Promise<void> {
    const server = `ws://${await getIp(this.homey)}:${OUTBOUND_WS_PORT}/${this.getAppId()}`;
    if (component.config.enable && component.config.server === server) {
      this.log('Outbound websocket already enabled');
      return;
    }
    this.log('Enabling outbound websocket...');
    await component.SetConfig(this.getChannel(), { config: { enable: true, server: server } });
    await this.reboot();
  }

  async disableOutboundWebsocket(component: OutboundWebsocket): Promise<void> {
    if (!component.config.enable) {
      this.log('Outbound websocket already disabled');
      return;
    }
    this.log('Disabling outbound websocket...');
    await component.SetConfig(this.getChannel(), { config: { enable: false } });
    await this.reboot();
  }

  // TODO ensure this works with all channel types
  async reboot(initialWaitTime = 1000, pingTime = 500): Promise<void> {
    await Shelly.Reboot(this.getChannel(), { delay_ms: initialWaitTime });
    this.log('Rebooting...');
    // Give the device time to shut down
    await new Promise(resolve => setTimeout(resolve, initialWaitTime));
    while (true) {
      try {
        await Shelly.GetDeviceInfo(this.getChannel());
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

export default class PlaceholderDevice extends ShellyDevice {
  private httpChannel!: HttpChannel;
  private inboundWs!: InboundWebsocket;

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
    this.log('PlaceholderDevice has been initialized');

    const { address } = this.getTypedStore();

    this.httpChannel = new HttpChannel(address);
    this.inboundWs = new InboundWebsocket(address, this.log, this.error);

    // this.inboundWs.registerUpdateHandler(update => {
    //   this.log('UPDATE:', update);
    // });

    await this.initialize();
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
}
