import type ShellyApp from '../app.mjs';
import type { RpcChannel } from './rpc/channel/RpcChannel.mjs';
import HttpChannel from './rpc/channel/HttpChannel.mjs';
import InboundWebsocketChannel from './rpc/channel/InboundWebsocketChannel.mjs';
import OutboundWebsocketChannel from './rpc/channel/OutboundWebsocketChannel.mjs';
import WebSocket from 'ws';
import { ComponentMapping, type MappedComponent } from './component/ComponentMapping.mjs';
import type { ShellyGetComponentsResponseComponent } from './component/components/Shelly/GetComponents.mjs';
import Shelly from './component/components/Shelly.mjs';
import type { ComponentMethod, NameSpace } from './component/components/Shelly/ListMethods.mjs';
import type OutboundWebsocket from './component/components/OutboundWebsocket.mjs';
import { getIp } from './LocalIp.mjs';
import { OUTBOUND_WS_PORT } from './config.mjs';
import { RpcError } from './rpc/RpcError.mjs';

export type SerializedVirtualDevice = {
  readonly deviceId: string;
  readonly ipAddress: string;
  readonly components: readonly string[];
  readonly homeyDeviceIds: readonly string[];
};

export class VirtualDevice {
  public readonly httpChannel: HttpChannel;
  public inboundWsChannel?: InboundWebsocketChannel;
  public outboundWsChannel?: OutboundWebsocketChannel;

  private readonly initializedComponents = new Map<string, InstanceType<MappedComponent>>();

  get virtualComponents(): ReadonlyMap<string, InstanceType<MappedComponent>> {
    return this.initializedComponents;
  }

  constructor(
    private readonly app: ShellyApp,
    public readonly deviceId: string,
    private ipAddress: string,
    private readonly components: readonly string[],
    private homeyDeviceIds: string[],
    // Allow passing these in the pairing flow so we do not need to retrieve them twice
    componentResponses?: ShellyGetComponentsResponseComponent[],
  ) {
    this.log = (...args): void => this.app.log(`[Virtual:${deviceId}]`, ...args);
    this.error = (...args): void => this.app.error(`[Virtual:${deviceId}]`, ...args);

    this.httpChannel = new HttpChannel(ipAddress);

    this.initialize(componentResponses)
      .then(() => {
        this.log('Initialized');
      })
      .catch(err => {
        this.error('Error while initializing components:', err);
      });
  }

  public readonly log: (...args: unknown[]) => void;
  public readonly error: (...args: unknown[]) => void;

  public serialize(): SerializedVirtualDevice {
    return {
      deviceId: this.deviceId,
      ipAddress: this.ipAddress,
      components: this.components,
      homeyDeviceIds: this.homeyDeviceIds,
    };
  }

  private async initialize(components: ShellyGetComponentsResponseComponent[] | undefined): Promise<void> {
    await this.connect();

    if (components === undefined) {
      components = await this.retrieveComponents();
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

    await this.initializeComponents(components, methodMapping);
    await this.initializeHomeyDevices(methodMapping);
  }

  private async initializeComponents(
    components: ShellyGetComponentsResponseComponent[],
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
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
      this.initializedComponents.set(component.key, componentInstance);
    }

    const oldComponents = this.components ?? [];

    for (const componentId of oldComponents) {
      if (!this.initializedComponents.has(componentId)) {
        // TODO unregister
      }
    }

    for (const component of this.initializedComponents.values()) {
      const methods = methodMapping[component.namespace] ?? [];
      await component.register(methods as never).catch(this.error);
    }
  }

  private async initializeHomeyDevices(
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
    const foundDevices: string[] = [];
    const initializers = [];
    for (const homeyDeviceId of this.homeyDeviceIds) {
      const homeyDevice = this.app.getDevice(homeyDeviceId);
      if (homeyDevice === undefined) {
        this.log('No homeyDevice found for', homeyDeviceId);
        continue;
      }
      foundDevices.push(homeyDeviceId);
      initializers.push(homeyDevice.initializeShelly(this, methodMapping));
    }
    this.homeyDeviceIds = foundDevices;
    await this.app.updateVirtualDevice(this);
    await Promise.all(initializers);
  }

  private async retrieveComponents(): Promise<ShellyGetComponentsResponseComponent[]> {
    const components: ShellyGetComponentsResponseComponent[] = [];
    while (true) {
      const componentsResponse = await Shelly.GetComponents(this.httpChannel, {
        offset: components.length,
        keys: this.components as string[],
      });
      components.push(...componentsResponse.result.components);
      if (components.length >= componentsResponse.result.total) {
        break;
      }
    }
    return components;
  }

  getChannel(): RpcChannel {
    // For sending, prefer inbound WS channel > httpChannel > outbound WS channel
    if (this.inboundWsChannel !== undefined && this.inboundWsChannel.ws.readyState === WebSocket.OPEN) {
      return this.inboundWsChannel;
    }
    return this.httpChannel;
  }

  // TODO ensure this works with all channel types getChannel can return
  async configureOutboundWebsocket(component: OutboundWebsocket): Promise<void> {
    const server = `ws://${await getIp(this.app.homey)}:${OUTBOUND_WS_PORT}`;
    if (component.config.enable && component.config.server === server) {
      this.log('Outbound websocket already enabled');
      return;
    }
    this.log('Enabling outbound websocket...');
    await component.SetConfig(this.httpChannel, { config: { enable: true, server: server } });
    await this.reboot();
  }

  // TODO ensure this works with all channel types getChannel can return
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

  async removeHomeyDevice(id: string): Promise<void> {
    this.homeyDeviceIds = this.homeyDeviceIds.filter(deviceId => deviceId !== id);
    if (this.homeyDeviceIds.length > 0) {
      return this.app.updateVirtualDevice(this);
    }
    // Uninitialize if no child devices remain
    return this.uninitialize();
  }

  async connect(): Promise<void> {
    this.inboundWsChannel = this.app.channelController.registerInboundWsChannel(this.ipAddress);
    this.outboundWsChannel = this.app.channelController.registerOutboundWsChannel(this.deviceId);
  }

  private async uninitialize(): Promise<void> {
    // TODO unregister components?
    await this.disconnect();
    await this.app.removeVirtualDevice(this);
  }

  async disconnect(): Promise<void> {
    if (this.inboundWsChannel !== undefined) {
      this.app.channelController.unregisterInboundWsChannel(this.inboundWsChannel);
    }
    if (this.outboundWsChannel !== undefined) {
      this.app.channelController.unregisterOutboundWsChannel(this.outboundWsChannel);
    }
  }
}
