import type ShellyApp from '../app.js';
import type { Component } from './component/Component.js';
import type { RpcChannel } from './rpc/channel/RpcChannel.js';
import type HttpChannel from './rpc/channel/HttpChannel.js';
import type InboundWebsocketChannel from './rpc/channel/InboundWebsocketChannel.js';
import type OutboundWebsocketChannel from './rpc/channel/OutboundWebsocketChannel.js';
import WebSocket from 'ws';
import { ComponentMapping, type MappedComponent } from './component/ComponentMapping.js';
import type { ShellyGetComponentsResponseComponent } from './component/components/Shelly/GetComponents.js';
import Shelly from './component/components/Shelly.js';
import type { ComponentMethod, NameSpace } from './component/components/Shelly/ListMethods.js';
import type { NotificationEventFrame, NotificationFrame, NotificationStatusFrame } from './rpc/Rpc.js';
import type ShellyLocalDevice from './local/LocalDevice.js';
import { createHttpChannel, createInboundWsChannel, createOutboundWsChannel } from './HomeyRPCChannels.js';
import type ShellyLocalDriver from './local/LocalDriver.js';
import type { ShellyLocalListDeviceProperties, ShellyLocalListVirtualDeviceProperties } from './types.js';
import { diffArrays } from './util.js';

export const IGNORED_NO_IMPLEMENTATION_COMPONENTS = [
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

// TODO password change on re-pair
export type SerializedVirtualDevice = {
  readonly deviceId: string;
  readonly ipAddress: string;
  readonly batteryDevice: boolean;
  readonly components: readonly string[];
  readonly homeyDeviceIds: readonly string[];
  readonly ha1: string | undefined;
  readonly useHttps: boolean;
  readonly driver: string;
};

type StateData = {
  uninitialized: [];
  online: [Array<ShellyGetComponentsResponseComponent> | undefined] | [];
  offline: [];
  sleeping: [];
  error: [string];
};

type State = keyof StateData;

export class VirtualDevice {
  private readonly httpChannel: HttpChannel;
  private readonly inboundWsChannel?: InboundWebsocketChannel;
  private readonly outboundWsChannel?: OutboundWebsocketChannel;

  private initialized = false;
  private readonly initializedComponents = new Map<string, InstanceType<MappedComponent>>();
  private readonly initializedHomeyDevices = new Map<string, ShellyLocalDevice>();

  public get virtualComponents(): ReadonlyMap<string, InstanceType<MappedComponent>> {
    return this.initializedComponents;
  }

  private state: State;

  public constructor(
    public readonly app: ShellyApp,
    public readonly deviceId: string,
    private ipAddress: string,
    private batteryDevice: boolean,
    private components: readonly string[],
    private readonly driver: string,
    private homeyDeviceIds: string[],
    private useHttps: boolean,
    private ha1: string | undefined,
    // Allow passing these in the pairing flow so we do not need to retrieve them twice
    componentResponses?: ShellyGetComponentsResponseComponent[],
  ) {
    this.state = 'uninitialized';

    this.log = (...args): void => this.app.log(`[Virtual:${deviceId}]`, ...args);
    this.error = (...args): void => this.app.error(`[Virtual:${deviceId}]`, ...args);
    this.debug = (...args): void => this.app.debug(`[Virtual:${deviceId}]`, ...args);

    // Initialize channels
    {
      if (this.useHttps) {
        this.log('Using HTTPS');
      }
      this.httpChannel = createHttpChannel(
        ipAddress,
        this.app.homey.__,
        this.useHttps,
        this.ha1,
        this.onHttpsUpgrade.bind(this),
      );

      if (!this.batteryDevice) {
        this.inboundWsChannel = createInboundWsChannel(
          this.app,
          this.ipAddress,
          this.log,
          this.error,
          this.useHttps,
          this.onHttpsUpgrade.bind(this),
          this.ha1,
        );
        this.inboundWsChannel.eventEmitter.on('notification', this.handleWsNotification.bind(this));
        this.inboundWsChannel.eventEmitter.on('opened', this.safeInitialize.bind(this));
      }

      this.outboundWsChannel = createOutboundWsChannel(
        this.app,
        this.deviceId,
        this.app.outboundWsServer.outboundWsMitt,
        this.log,
        this.error,
      );
      this.outboundWsChannel.eventEmitter.on('notification', this.handleOutboundWsNotification.bind(this));
      this.outboundWsChannel.eventEmitter.on('opened', (...args) => {
        this.inboundWsChannel?.resetReconnectTimeout();
        this.inboundWsChannel?.safeConnect();
        return this.safeInitialize(...args);
      });
    }

    // TODO does this need a nextTick?
    void this.safeInitialize(componentResponses);
  }

  public readonly log: (...args: unknown[]) => void;
  public readonly error: (...args: unknown[]) => void;
  public readonly debug: (...args: unknown[]) => void;

  private async onHttpsUpgrade(): Promise<void> {
    this.httpChannel.useHttps = true;
    await this.app.updateVirtualDevice(this);
  }

  public async transition<NewState extends Exclude<State, 'uninitialized'>>(
    newState: NewState,
    ...args: StateData[NewState]
  ): Promise<void> {
    if (this.state === 'uninitialized') {
      return;
    }

    switch (newState) {
      case 'sleeping':
      case 'online':
        if (this.state !== 'online' && this.state !== 'sleeping') {
          await this.setAvailable();
        }
        break;
      case 'offline':
        if (this.state !== 'offline') {
          await this.setUnavailable(this.app.homey.__('device.offline'));
        }
        break;
      case 'error': {
        const [message] = args as StateData['error'];
        await this.setUnavailable(message);
        break;
      }
    }

    if (this.state !== newState) {
      this.debug(this.state, '->', newState);
    }
    this.state = newState;
  }

  public serialize(): SerializedVirtualDevice {
    return {
      deviceId: this.deviceId,
      ipAddress: this.ipAddress,
      batteryDevice: this.batteryDevice,
      components: this.components,
      driver: this.driver,
      homeyDeviceIds: this.homeyDeviceIds,
      useHttps: this.httpChannel.useHttps,
      ha1: this.ha1,
    };
  }

  private async safeInitialize(components?: ShellyGetComponentsResponseComponent[]): Promise<void> {
    if (this.initialized) {
      await this.transition('online');
      return;
    }
    this.log('Initializing...');
    try {
      this.initialized = true;
      await this.initialize(components);
      this.state = 'online';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.initialized = false;

      if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.code === 'EHOSTUNREACH') {
        // Set devices unavailable
        for (const homeyDeviceId of this.homeyDeviceIds) {
          this.app.getLocalDevice(homeyDeviceId)?.setUnavailable(this.app.homey.__('device.offline')).catch(this.error);
        }
      }

      this.error('Error while initializing components:', error);
    }
  }

  private async initialize(components: ShellyGetComponentsResponseComponent[] | undefined): Promise<void> {
    // Retrieve the Homey devices associated with this virtual device
    const homeyDevices: ShellyLocalDevice[] = [];

    for (const homeyDeviceId of this.homeyDeviceIds) {
      const homeyDevice = this.app.getLocalDevice(homeyDeviceId);
      if (homeyDevice !== undefined) {
        homeyDevices.push(homeyDevice);
      } else {
        this.log('No homeyDevice found for', homeyDeviceId);
      }
    }

    for (const homeyDevice of homeyDevices) {
      await homeyDevice.setUnavailable(this.app.homey.__('device.initializing'));
    }

    this.log(homeyDevices.length, 'children found again');

    // If no Homey devices remain the virtual device should also be removed
    if (homeyDevices.length === 0) {
      await this.unregister();
      return;
    }

    if (components === undefined) {
      components = await this.retrieveComponents();
    }

    // Check which changes were made to the components since last time
    const oldComponents = this.components as string[];
    const newComponents = components.map(component => component.key) as string[];
    const { added: addedComponents, removed: removedComponents } = diffArrays(oldComponents, newComponents);

    this.debug('Removed components:', removedComponents);
    this.debug('Added components:', addedComponents);

    // Before version 0.3.0 the Homey driver associated with the virtual device was not stored
    if (this.driver === undefined) {
      // TODO remove this in 1.0.0
      const homeyDevice = homeyDevices[0];
      await homeyDevice.ready();
      // @ts-expect-error this.driver is readonly
      this.driver = homeyDevice.driver.id;
    }

    // Check whether changes to the components require adding/removing Homey devices
    const newDevices = await this.assembleDevices(components);

    const oldDeviceIds = this.homeyDeviceIds;
    const newDeviceIds: string[] = newDevices.map(device => device.data.id);

    const { added: deviceIdsToAdd, removed: deviceIdsToRemove } = diffArrays(oldDeviceIds, newDeviceIds);

    this.debug('Homey devices to remove:', deviceIdsToRemove);
    this.debug('Homey devices to add:', deviceIdsToAdd);

    // Only initialize Homey devices that are still used.
    // Set the ones that are not to unavailable with a message saying they can be removed,
    // since we cannot do that ourselves.
    const filteredDevices: ShellyLocalDevice[] = [];

    for (const homeyDevice of homeyDevices) {
      if (deviceIdsToRemove.includes(homeyDevice.getTypedData().id)) {
        await homeyDevice.setUnavailable(this.app.homey.__('device.device_removed'));
      } else {
        filteredDevices.push(homeyDevice);
      }
    }

    // If a Homey device needs to be added, set all current Homey devices to unavailable
    // with a message saying the user needs to re-pair one, since we cannot add one ourselves.
    if (deviceIdsToAdd.length > 0) {
      await this.setUnavailable(this.app.homey.__('device.device_added'));
      return;
    }

    const methodMapping = await this.getMethodMapping();

    // Remove before adding, to avoid conflicts
    await this.unregisterComponents(removedComponents);
    await this.initializeComponents(components, methodMapping);
    await this.initializeHomeyDevices(filteredDevices, newDevices, methodMapping);

    this.components = newComponents;
    this.homeyDeviceIds = newDeviceIds;
    await this.app.updateVirtualDevice(this);
    this.log('Initialized');
  }

  private async initializeComponents(
    components: ShellyGetComponentsResponseComponent[],
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
    for (const component of components) {
      const [componentName] = component.key.split(':') as [string, `${number}` | undefined];
      const componentConstructor = ComponentMapping[componentName as never] as MappedComponent | undefined;
      // Ignore components for which we have no implementation
      if (componentConstructor === undefined) {
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

    for (const component of this.initializedComponents.values()) {
      const methods = methodMapping[component.namespace] ?? [];
      await component.register(methods as never).catch(this.error);
    }
  }

  private async unregisterComponents(componentIds: ReadonlyArray<string>): Promise<void> {
    for (const componentId of componentIds) {
      const [componentName] = componentId.split(':') as [string, `${number}` | undefined];
      const componentConstructor = ComponentMapping[componentName as never] as MappedComponent | undefined;
      if (componentConstructor === undefined) {
        continue;
      }
      await componentConstructor.unregister(this);
    }
  }

  // TODO use this for non-dynamic components as well
  public async onComponentAdded(newComponentId: string): Promise<void> {
    this.log(`Adding ${newComponentId}...`);
    const components = await this.retrieveComponents();
    const newDeviceDefinitions = await this.assembleDevices(components);

    // Only update Homey devices that get the new component
    const filteredNewDevices = newDeviceDefinitions.filter(newDevice =>
      newDevice.store.components.includes(newComponentId),
    );
    const newDeviceIds: string[] = filteredNewDevices.map(device => device.data.id);

    // Check whether new Homey devices are required for the new component
    const { added: deviceIdsToAdd } = diffArrays(this.homeyDeviceIds, newDeviceIds, { returnRemoved: false });
    this.debug('Homey devices to add:', deviceIdsToAdd);

    // If a Homey device needs to be added, set all current Homey devices to unavailable
    // with a message saying the user needs to re-pair one, since we cannot add one ourselves.
    if (deviceIdsToAdd.length > 0) {
      await this.setUnavailable(this.app.homey.__('device.device_added'));
      return;
    }

    const methodMapping = await this.getMethodMapping();
    await this.initializeComponents(components, methodMapping);

    for (const homeyDeviceId of newDeviceIds) {
      const homeyDevice = this.app.getLocalDevice(homeyDeviceId);
      if (homeyDevice === undefined) {
        throw new Error(`Could not find a Homey device for id ${homeyDevice}`);
      }
      await homeyDevice.addComponent(newComponentId, methodMapping);
    }

    this.components = [...this.components, newComponentId];
    await this.app.updateVirtualDevice(this);
    this.log(`Added ${newComponentId}`);
  }

  // TODO use this for non-dynamic components as well
  public async onComponentRemoved(componentId: string): Promise<void> {
    this.log(`Removing ${componentId}...`);
    const components = await this.retrieveComponents();
    const newDeviceDefinitions = await this.assembleDevices(components);
    const newDeviceIds = newDeviceDefinitions.map(device => device.data.id);

    // Check whether any Homey devices are no longer needed without this component
    const { removed: deviceIdsToRemove } = diffArrays(this.homeyDeviceIds, newDeviceIds, { returnAdded: false });

    this.debug('Homey devices to remove:', deviceIdsToRemove);

    // Set the ones that are no longer used to unavailable with a message saying they can be removed,
    // since we cannot do that ourselves.
    for (const homeyDeviceId of deviceIdsToRemove) {
      const homeyDevice = this.app.getLocalDevice(homeyDeviceId);
      if (homeyDevice === undefined) {
        throw new Error(`Could not find a Homey device for id ${homeyDevice}`);
      }
      await homeyDevice.setUnavailable(this.app.homey.__('device.device_removed'));
    }

    const methodMapping = await this.getMethodMapping();
    await this.unregisterComponents([componentId]);

    for (const homeyDeviceId of newDeviceIds) {
      const homeyDevice = this.app.getLocalDevice(homeyDeviceId);
      if (homeyDevice === undefined) {
        throw new Error(`Could not find a Homey device for id ${homeyDevice}`);
      }
      await homeyDevice.removeComponent(componentId, methodMapping);
    }

    this.components = this.components.filter(oldComponentId => oldComponentId !== componentId);
    await this.app.updateVirtualDevice(this);
    this.log(`Removed ${componentId}`);
  }

  private async assembleDevices(
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const driver = this.app.homey.drivers.getDriver(this.driver) as ShellyLocalDriver;

    const { mainComponents, addonComponents } = driver.splitComponents(components);
    const virtualHomeyDevice: ShellyLocalListVirtualDeviceProperties = {
      name: 'Virtual',
      data: {
        id: this.deviceId,
        useHttps: this.httpChannel.useHttps,
      },
      store: {
        address: this.ipAddress,
        port: -1,
        components: [],
      },
    };

    const newDevices: ShellyLocalListDeviceProperties[] = [];
    newDevices.push(...(await driver.assembleHomeyDevices(virtualHomeyDevice, mainComponents)));
    if (addonComponents.length > 0) {
      newDevices.push(...(await driver.assembleAddonHomeyDevices(virtualHomeyDevice, addonComponents)));
    }
    return newDevices;
  }

  private async initializeHomeyDevices(
    homeyDevices: ShellyLocalDevice[],
    newDeviceDefinitions: ShellyLocalListDeviceProperties[],
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
    const newComponentIdsMapping = new Map<string, string[]>();
    for (const deviceDefinition of newDeviceDefinitions) {
      newComponentIdsMapping.set(deviceDefinition.data.id, deviceDefinition.store.components);
    }

    const initializers = [];
    for (const homeyDevice of homeyDevices) {
      this.initializedHomeyDevices.set(homeyDevice.getTypedData().id, homeyDevice);
      const newComponentIds = newComponentIdsMapping.get(homeyDevice.getTypedData().id);
      if (newComponentIds === undefined) {
        await homeyDevice.setUnavailable(homeyDevice.homey.__('device.initialization_error'));
        homeyDevice.error('No new components definition found');
        continue;
      }
      // Catch errors here so one device throwing an error does not prevent others initializing
      initializers.push(
        homeyDevice.initializeShelly(this, newComponentIds, methodMapping).catch(error => {
          homeyDevice.error(error);
          homeyDevice.setUnavailable(homeyDevice.homey.__('device.initialization_error'));
        }),
      );
    }
    await Promise.all(initializers);
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

  private async getMethodMapping(): Promise<Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>> {
    const methodsResponse = await Shelly.ListMethods(this.getChannel());
    const methods = methodsResponse.result.methods;

    const methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>> = {};
    for (const methodString of methods) {
      const [namespace, method] = methodString.split('.') as [NameSpace, ComponentMethod<NameSpace>];
      const namespaceMethods = methodMapping[namespace] ?? [];
      namespaceMethods.push(method);
      methodMapping[namespace] = namespaceMethods;
    }
    return methodMapping;
  }

  public async reboot({ initialWaitTime = undefined } = {}): Promise<void> {
    this.log('Rebooting...');
    await Shelly.Reboot(this.httpChannel, { delay_ms: initialWaitTime });
  }

  public async removeHomeyDevice(id: string): Promise<void> {
    this.initializedHomeyDevices.delete(id);
    this.homeyDeviceIds = [...this.initializedHomeyDevices.keys()];
    this.log(this.homeyDeviceIds.length, 'children remaining');
    if (this.homeyDeviceIds.length > 0) {
      return this.app.updateVirtualDevice(this);
    }
    // Remove if no child devices remain
    await this.unregister();
  }

  private async unregister(): Promise<void> {
    try {
      await this.unregisterComponents(this.components);
      await this.disconnect();
    } finally {
      await this.app.removeVirtualDevice(this);
      this.log('Uninitialized');
    }
  }

  public async disconnect(): Promise<void> {
    this.inboundWsChannel?.disconnect();
    this.outboundWsChannel?.disconnect();
  }

  private handleWsNotification(notification: NotificationFrame): void {
    this.transition('online').catch(this.error);

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
          const componentInstance = homeyDevice.virtualComponents.get(component);
          if (!componentInstance) {
            continue;
          }

          (componentInstance as unknown as Component<never, never, never, never>)
            .updateStatus(homeyDevice, statusUpdate as never)
            .catch(this.error);
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
        await this.transition('offline');
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
