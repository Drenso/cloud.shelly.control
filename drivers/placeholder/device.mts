import Homey from 'homey';
import HttpChannel from '../../lib/rpc/channel/HttpChannel.mjs';
import Shelly from '../../lib/component/components/Shelly.mjs';
import { ComponentMapping, type MappedComponent } from '../../lib/component/ComponentMapping.mjs';
import { getFromRecord } from '../../lib/util.mjs';
import type { RpcChannel } from '../../lib/rpc/channel/RpcChannel.mjs';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.mjs';

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
}

export default class PlaceholderDevice extends ShellyDevice {
  private httpChannel!: HttpChannel;

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

    this.log(components);

    for (const component of components) {
      const [componentName, componentId] = component.key.split(':');
      const componentConstructor: MappedComponent | undefined = getFromRecord(ComponentMapping, componentName);
      if (!componentConstructor) {
        continue;
      }
      const componentInstance = new componentConstructor(component.status!, component.config!);
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
