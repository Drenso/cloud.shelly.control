import type ShellyApp from '../app.mjs';
import type { RpcChannel } from './rpc/channel/RpcChannel.mjs';
import type HttpChannel from './rpc/channel/HttpChannel.mjs';
import type InboundWebsocketChannel from './rpc/channel/InboundWebsocketChannel.mjs';
import type OutboundWebsocketChannel from './rpc/channel/OutboundWebsocketChannel.mjs';
import WebSocket from 'ws';
import { ComponentMapping, type MappedComponent } from './component/ComponentMapping.mjs';
import type { ShellyGetComponentsResponseComponent } from './component/components/Shelly/GetComponents.mjs';
import Shelly from './component/components/Shelly.mjs';
import type { ComponentMethod, NameSpace } from './component/components/Shelly/ListMethods.mjs';
import { RpcError } from './rpc/RpcError.mjs';
import type { NotificationEventFrame, NotificationFrame, NotificationStatusFrame } from './rpc/Rpc.mjs';
import type ShellyLocalDevice from './local/LocalDevice.mjs';
import RPC from './component/components/RPC.mjs';
import { createHttpChannel, createInboundWsChannel, createOutboundWsChannel } from './HomeyRPCChannels.mjs';

const IGNORED_NO_IMPLEMENTATION_COMPONENTS = [
  'ble',
  'bthome',
  'cloud',
  'knx',
  'matter',
  'modbus',
  'mqtt',
  'wifi',
  'zigbee',
];

const REBOOT_INITIAL_WAIT = 1000;
const REBOOT_PING_TIME = 500;
const REBOOT_TIMEOUT = 30 * 1000;

// TODO password change on re-pair
export type SerializedVirtualDevice = {
  readonly deviceId: string;
  readonly ipAddress: string;
  readonly components: readonly string[];
  readonly homeyDeviceIds: readonly string[];
  readonly ha1: string | undefined;
};

export class VirtualDevice {
  public readonly httpChannel: HttpChannel;
  public readonly inboundWsChannel: InboundWebsocketChannel;
  public readonly outboundWsChannel: OutboundWebsocketChannel;

  private initialized = false;
  private readonly initializedComponents = new Map<string, InstanceType<MappedComponent>>();
  private readonly initializedHomeyDevices = new Map<string, ShellyLocalDevice>();

  public get virtualComponents(): ReadonlyMap<string, InstanceType<MappedComponent>> {
    return this.initializedComponents;
  }

  public constructor(
    public readonly app: ShellyApp,
    public readonly deviceId: string,
    private ipAddress: string,
    private readonly components: readonly string[],
    private homeyDeviceIds: string[],
    private ha1: string | undefined,
    // Allow passing these in the pairing flow so we do not need to retrieve them twice
    componentResponses?: ShellyGetComponentsResponseComponent[],
  ) {
    this.log = (...args): void => this.app.log(`[Virtual:${deviceId}]`, ...args);
    this.error = (...args): void => this.app.error(`[Virtual:${deviceId}]`, ...args);
    this.debug = (...args): void => this.app.debug(`[Virtual:${deviceId}]`, ...args);

    // Initialize channels
    {
      this.httpChannel = createHttpChannel(ipAddress, this.ha1);

      this.inboundWsChannel = createInboundWsChannel(this.ipAddress, this.log, this.error, this.ha1);
      this.inboundWsChannel.eventEmitter.on('notification', this.handleWsNotification.bind(this));
      this.inboundWsChannel.eventEmitter.on('opened', this.safeInitialize.bind(this));

      this.outboundWsChannel = createOutboundWsChannel(
        this.deviceId,
        this.app.outboundWsServer.outboundWsMitt,
        this.log,
        this.error,
      );
      this.outboundWsChannel.eventEmitter.on('notification', this.handleOutboundWsNotification.bind(this));
      this.outboundWsChannel.eventEmitter.on('opened', this.safeInitialize.bind(this));
    }

    // TODO does this need a nextTick?
    void this.safeInitialize(componentResponses);
  }

  public readonly log: (...args: unknown[]) => void;
  public readonly error: (...args: unknown[]) => void;
  public readonly debug: (...args: unknown[]) => void;

  public serialize(): SerializedVirtualDevice {
    return {
      deviceId: this.deviceId,
      ipAddress: this.ipAddress,
      components: this.components,
      homeyDeviceIds: this.homeyDeviceIds,
      ha1: this.ha1,
    };
  }

  private async safeInitialize(components?: ShellyGetComponentsResponseComponent[]): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.log('Initializing...');
    try {
      this.initialized = true;
      await this.initialize(components);
    } catch (error) {
      this.initialized = false;
      this.error('Error while initializing components:', error);
    }
  }

  private async initialize(components: ShellyGetComponentsResponseComponent[] | undefined): Promise<void> {
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
        if (!IGNORED_NO_IMPLEMENTATION_COMPONENTS.includes(componentName)) {
          this.debug('\x1b[31mNo implementation found for', componentName, '\x1b[0m');
        }
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
    const initializers = [];
    for (const homeyDeviceId of this.homeyDeviceIds) {
      const homeyDevice = this.app.getDevice(homeyDeviceId);
      if (homeyDevice === undefined) {
        this.log('No homeyDevice found for', homeyDeviceId);
        continue;
      }
      this.initializedHomeyDevices.set(homeyDeviceId, homeyDevice);
      // Catch errors here so one device throwing an error does not prevent others initializing
      initializers.push(
        homeyDevice.initializeShelly(this, methodMapping).catch(error => {
          homeyDevice.error(error);
          homeyDevice.setUnavailable(homeyDevice.homey.__('device.initialization_error'));
        }),
      );
    }
    this.homeyDeviceIds = [...this.initializedHomeyDevices.keys()];
    this.log(this.homeyDeviceIds.length, 'children found again');
    if (this.homeyDeviceIds.length === 0) {
      await this.uninitialize();
    } else {
      await this.app.updateVirtualDevice(this);
      await Promise.all(initializers);
      this.log('Initialized');
    }
  }

  private async retrieveComponents(): Promise<ShellyGetComponentsResponseComponent[]> {
    const components: ShellyGetComponentsResponseComponent[] = [];
    while (true) {
      const componentsResponse = await Shelly.GetComponents(this.httpChannel, {
        offset: components.length,
      });
      components.push(...componentsResponse.result.components);
      if (components.length >= componentsResponse.result.total) {
        break;
      }
    }
    return components;
  }

  public getChannel(): RpcChannel {
    // For sending, prefer inbound WS channel > httpChannel > outbound WS channel
    if (this.inboundWsChannel !== undefined && this.inboundWsChannel.ws.readyState === WebSocket.OPEN) {
      return this.inboundWsChannel;
    }

    return this.httpChannel;
  }

  // TODO ensure this works for battery/BLE devices
  public async reboot({
    awaitRestart = true,
    initialWaitTime = REBOOT_INITIAL_WAIT,
    pingTime = REBOOT_PING_TIME,
  } = {}): Promise<void> {
    await this.setUnavailable(this.app.homey.__('device.restarting'));
    await Shelly.Reboot(this.httpChannel, { delay_ms: initialWaitTime });
    const restart = this.resolveReboot(initialWaitTime, pingTime).finally(async () => {
      await this.setAvailable().catch(this.error);
    });
    if (awaitRestart) {
      await restart;
    }
  }

  private async resolveReboot(initialWaitTime: number, pingTime: number, timeout = REBOOT_TIMEOUT): Promise<void> {
    let timedOut = false;
    const rebootTimeout = setTimeout(() => (timedOut = true), timeout);
    try {
      // Give the device time to shut down
      await new Promise(resolve => setTimeout(resolve, initialWaitTime));
      while (!timedOut) {
        try {
          await RPC.Ping(this.httpChannel);
          this.log('Finished rebooting');
          return;
        } catch (e) {
          if (
            (e instanceof RpcError && e.code === -109) ||
            (e as { code: string }).code === 'UND_ERR_CONNECT_TIMEOUT'
          ) {
            this.log('Still rebooting...');
            // Wait before trying again
            await new Promise(resolve => setTimeout(resolve, pingTime));
            continue;
          }
          throw e;
        }
      }
      throw new Error('Reboot timed out');
    } finally {
      clearTimeout(rebootTimeout);
    }
  }

  public async removeHomeyDevice(id: string): Promise<void> {
    this.initializedHomeyDevices.delete(id);
    this.homeyDeviceIds = [...this.initializedHomeyDevices.keys()];
    this.log(this.homeyDeviceIds.length, 'children remaining');
    if (this.homeyDeviceIds.length > 0) {
      return this.app.updateVirtualDevice(this);
    }
    // Uninitialize if no child devices remain
    return this.uninitialize();
  }

  private async uninitialize(): Promise<void> {
    // TODO unregister components?
    await this.disconnect();
    await this.app.removeVirtualDevice(this);
    this.log('Uninitialized');
  }

  public async disconnect(): Promise<void> {
    this.inboundWsChannel.disconnect();
    this.outboundWsChannel.disconnect();
  }

  private handleWsNotification(notification: NotificationFrame): void {
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
        for (const homeyDevice of this.initializedHomeyDevices.values()) {
          homeyDevice.virtualComponents.get(component)?.onStatusUpdate(homeyDevice, statusUpdate as never);
        }
      }
    } else if (notification.method === 'NotifyEvent') {
      const eventNotification = notification as NotificationEventFrame;
      this.handleEventNotification(eventNotification).catch(this.error);
    } else {
      this.log('Unhandled WS notification method:', notification.method);
    }
  }

  private async handleEventNotification(eventNotification: NotificationEventFrame): Promise<void> {
    for (const event of eventNotification.params.events) {
      if (event.event === 'config_changed') {
        await this.handleConfigChangedEvent(event.component).catch(this.error);
      } else if (event.event === 'scheduled_restart') {
        this.log('Device is restarting');
      } else {
        const component = this.virtualComponents.get(event.component);
        if (component !== undefined) {
          await component.handleEvent(event).catch(this.error);
        } else {
          this.log(`No component ${event.component} found for ${event.event}`);
          this.debug(JSON.stringify(event));
        }
      }
    }
  }

  private async handleConfigChangedEvent(componentId: string): Promise<void> {
    const component = this.virtualComponents.get(componentId);
    if (!component) {
      return;
    }

    const newConfig = await component.GetConfig(this.getChannel());
    for (const homeyDevice of this.initializedHomeyDevices.values()) {
      await homeyDevice.virtualComponents.get(componentId)?.onConfigUpdate(homeyDevice, newConfig.result as never);
    }
  }

  private handleOutboundWsNotification(notification: NotificationFrame): void {
    if (!(this.inboundWsChannel === undefined || this.inboundWsChannel.ws.readyState !== WebSocket.OPEN)) {
      return;
    }

    this.handleWsNotification(notification);
  }

  public async setUnavailable(message: string): Promise<void> {
    const promises = [];
    for (const homeyDevice of this.initializedHomeyDevices.values()) {
      promises.push(homeyDevice.setUnavailable(message));
    }
    await Promise.all(promises);
  }

  public async setAvailable(): Promise<void> {
    const promises = [];
    for (const homeyDevice of this.initializedHomeyDevices.values()) {
      promises.push(homeyDevice.setAvailable());
    }
    await Promise.all(promises);
  }
}
