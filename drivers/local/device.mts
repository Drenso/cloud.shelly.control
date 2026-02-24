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
import WebSocket from 'ws';
import type { NotificationFrame, NotificationStatusFrame } from '../../lib/rpc/Rpc.mjs';
import type { ComponentMethod, NameSpace } from '../../lib/component/components/Shelly/ListMethods.mjs';

export type ShellyLocalDeviceStore = {
  address: string;
  port: number;
  host: string;
  name: string;
  txt: { ver: `${number}.${number}.${number}`; app: string; gen: `${number}` };
  components: string[];
};

export default class ShellyLocalDevice extends Homey.Device {
  private httpChannel!: HttpChannel;
  private inboundWsChannel?: InboundWebsocketChannel;
  private outboundWsChannel?: OutboundWebsocketChannel;

  private readonly registered = new Map<string, InstanceType<MappedComponent>>();

  getChannel(): RpcChannel {
    if (this.inboundWsChannel !== undefined && this.inboundWsChannel.ws.readyState === WebSocket.OPEN) {
      return this.inboundWsChannel;
    }
    return this.httpChannel;
  }

  get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  // Called after onInit
  async onAdded(): Promise<void> {
    // await this.initialize();
  }

  async initialize(): Promise<void> {
    const assignedComponentKeys = this.getTypedStore().components;

    const components: ShellyGetComponentsResponseComponent[] = [];
    while (true) {
      const componentsResponse = await Shelly.GetComponents(this.httpChannel, {
        offset: components.length,
        keys: assignedComponentKeys,
      });
      components.push(...componentsResponse.result.components);
      if (components.length >= componentsResponse.result.total) {
        break;
      }
    }

    const methodsResponse = await Shelly.ListMethods(this.getChannel());
    const methods = methodsResponse.result.methods;

    const methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>> = {};
    for (const methodString of methods) {
      const [namespace, method] = methodString.split('.') as [NameSpace, ComponentMethod<NameSpace>];
      const namespaceMethods = methodMapping[namespace] ?? [];
      namespaceMethods.push(method);
      methodMapping[namespace] = namespaceMethods;
    }

    for (const component of components) {
      const [componentName] = component.key.split(':') as [string, `${number}` | undefined];
      // @ts-expect-error TS definition is incorrect with behavior in practice
      const componentConstructor: MappedComponent | undefined = ComponentMapping[componentName];
      if (!componentConstructor) {
        this.log('No implementation found for', componentName);
        continue;
      }
      const componentInstance = new componentConstructor(
        this,
        // @ts-expect-error For some reason this gives the union instead of the intersection
        component.status as ConstructorParameters<MappedComponent>[1],
        component.config as ConstructorParameters<MappedComponent>[2],
      );
      this.registered.set(component.key, componentInstance);
    }

    const oldComponents = this.getTypedStore().components ?? [];

    for (const componentId of oldComponents) {
      if (!this.registered.has(componentId)) {
        // TODO unregister
      }
    }

    for (const component of this.registered.values()) {
      const methods = methodMapping[component.namespace] ?? [];
      // @ts-expect-error The typing does not support it, but methods can only have those values expected by the component
      await component.register(methods).catch(this.error);
    }
    await this.setStoreValue('components', [...this.registered.keys()]).catch(this.error);
  }

  async onInit(): Promise<void> {
    const { address, name } = this.getTypedStore();

    this.httpChannel = new HttpChannel(address);
    this.inboundWsChannel = this.app.registerInboundWsChannel(address);
    this.outboundWsChannel = this.app.registerOutboundWsChannel(name);

    this.inboundWsChannel.registerNotificationHandler(this, this.handleWsNotification.bind(this));
    this.outboundWsChannel.registerNotificationHandler(this, this.handleOutboundWsNotification.bind(this));

    await this.initialize();

    this.log('Initialized');
  }

  async onUninit(): Promise<void> {
    this.httpChannel.disconnect();
    if (this.inboundWsChannel !== undefined) {
      this.inboundWsChannel.unregisterNotificationHandler(this);
      this.app.unregisterInboundWsChannel(this.inboundWsChannel);
    }
    if (this.outboundWsChannel !== undefined) {
      this.outboundWsChannel.unregisterNotificationHandler(this);
      this.app.unregisterOutboundWsChannel(this.outboundWsChannel);
    }
    this.log('Uninitialized');
  }

  getTypedStore(): ShellyLocalDeviceStore {
    return this.getStore();
  }

  async safeAddCapability(id: string): Promise<void> {
    if (!this.hasCapability(id)) {
      await this.addCapability(id).catch(this.error);
    }
  }

  async safeRemoveCapability(id: string): Promise<void> {
    if (this.hasCapability(id)) {
      await this.removeCapability(id).catch(this.error);
    }
  }

  async safeSetCapability(id: string, value: unknown): Promise<void> {
    if (this.hasCapability(id)) {
      await this.setCapabilityValue(id, value).catch(this.error);
    }
  }

  handleWsNotification(notification: NotificationFrame): void {
    if (notification.method === 'NotifyStatus' || notification.method === 'NotifyFullStatus') {
      const statusNotification = notification as NotificationStatusFrame<string, object>;
      for (const component in statusNotification.params) {
        if (component === 'ts') {
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ts, ...statusUpdate } = statusNotification.params[component] as {
          ts?: number;
        };
        this.registered.get(component)?.updateStatus(statusUpdate as never);
      }
    } else {
      this.log('Unhandled WS notification method:', notification.method);
    }
  }

  handleOutboundWsNotification(notification: NotificationFrame): void {
    // Ignore outbound WS messages if an inbound WS is open
    if (this.inboundWsChannel === undefined || this.inboundWsChannel.ws.readyState !== WebSocket.OPEN) {
      this.handleWsNotification(notification);
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
