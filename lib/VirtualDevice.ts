import type ShellyApp from '../app.js';
import type { Component } from './component/Component.js';
import type { RpcChannel } from './rpc/channel/RpcChannel.js';
import type { HttpError } from './rpc/channel/HttpChannel.js';
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
import type { OutBoundWebsocketConfig } from './component/components/OutboundWebsocket.js';
import { getIp } from './LocalIp.js';
import { OUTBOUND_WS_PORT } from './config.js';
import SetConfig from './component/components/OutboundWebsocket/SetConfig.js';
import type Script from './component/components/Script.js';
import type { BleForwardEventData } from './ble/BTHome.js';
import { NoPassword } from './rpc/Authentication.js';

const MAX_STATE_RETRIES = 5;

export const IGNORED_NO_IMPLEMENTATION_COMPONENTS = [
  'ble',
  'bthome',
  'cloud',
  'eth',
  'knx',
  'matter',
  'modbus',
  'mqtt',
  'wifi',
  'zigbee',
];

export type SerializedVirtualDevice = {
  readonly deviceId: string;
  readonly ipAddress: string;
  readonly batteryDevice: boolean;
  readonly components: readonly string[];
  readonly homeyDeviceIds: readonly string[];
  readonly ha1: string | null;
  readonly useHttps: boolean;
  readonly driver: string;
  readonly bleForwardScriptId: number | null;
};

type StateActionInstance<Action extends string> = {
  action: Action;
  id?: undefined;
  error?: string;
};

type StateAction =
  | StateActionInstance<'app_initialized'>
  | StateActionInstance<'device_connected'>
  | StateActionInstance<'outbound_websocket_connected'>
  | StateActionInstance<'going_to_sleep'>
  | StateActionInstance<'going_offline'>
  | StateActionInstance<'reinitialize'>
  | (Omit<StateActionInstance<'removed_homey_device'>, 'id'> & { id: string });

type State = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transition(action: StateAction, ...args: Array<any>): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enter: (...args: Array<any>) => Promise<void>;
};

type StateName =
  | 'waiting_for_app_init'
  | 'checking_initial_homey_devices'
  | 'waiting_for_initial_connection'
  | 'waiting_for_outbound_ws_connection'
  | 'initializing'
  | 'online'
  | 'offline'
  | 'sleeping'
  | 'error'
  | 'removing_homey_device'
  | 'uninitializing';

type ConnectionSpecification = {
  ipAddress: string;
  ha1?: string | null;
  useHttps: boolean;
};

export class VirtualDevice {
  private localConnection: LocalConnection;

  public get ipAddress(): string {
    return this.localConnection.ipAddress;
  }

  private readonly initializedComponents = new Map<string, InstanceType<MappedComponent>>();
  private readonly initializedHomeyDevices = new Map<string, ShellyLocalDevice>();

  // TODO remove after 1.0.0
  // This variable should only be used during initial Homey device retrieval
  private initialHomeyDeviceIds?: readonly string[];

  // This variable should only be used during initialization
  private initialHomeyDevices?: readonly ShellyLocalDevice[];
  // This variable should only be used during initialization
  private initialHomeyDeviceDefinitions?: readonly ShellyLocalListDeviceProperties[];
  // This variable should only be used during initialization
  private initialComponentResponses?: readonly ShellyGetComponentsResponseComponent[];
  // This variable should only be used during initialization
  private initialComponents?: readonly string[];

  public get virtualComponents(): ReadonlyMap<string, InstanceType<MappedComponent>> {
    return this.initializedComponents;
  }

  private state: StateName;
  private outboundWsRetries = 0;
  private initRetries = 0;

  private bleForwardScript: Script | undefined;

  public constructor(
    public readonly app: ShellyApp,
    public readonly deviceId: string,
    ipAddress: string,
    public readonly batteryDevice: boolean,
    initialComponents: readonly string[],
    private readonly driver: string,
    initialHomeyDeviceIds: string[],
    useHttps: boolean,
    ha1: string | null,
    public bleForwardScriptId: number | null,
    // Allow passing these in the pairing flow so we do not need to retrieve them twice
    initialComponentResponses?: ShellyGetComponentsResponseComponent[],
    initialHomeyDeviceDefinitions?: ShellyLocalListDeviceProperties[],
  ) {
    this.log = (...args): void => this.app.log(`[Virtual:${deviceId}]`, ...args);
    this.error = (...args): void => this.app.error(`[Virtual:${deviceId}]`, ...args);
    this.debug = (...args): void => this.app.debug(`[Virtual:${deviceId}]`, ...args);

    this.localConnection = new LocalConnection(this, this.handleWsNotification.bind(this), ipAddress, useHttps, ha1);

    this.initialHomeyDeviceIds = initialHomeyDeviceIds;
    this.initialHomeyDeviceDefinitions = initialHomeyDeviceDefinitions;
    this.initialComponentResponses = initialComponentResponses;
    this.initialComponents = initialComponents;

    this.state = 'waiting_for_app_init';
    this.debugState('Waiting for app initialization...');
    this.app.localDriversReady.then(() => {
      void this.transition({ action: 'app_initialized' });
    });
  }

  public readonly log: (...args: unknown[]) => void;
  public readonly error: (...args: unknown[]) => void;
  public readonly debug: (...args: unknown[]) => void;

  public debugStates: boolean = true;
  private debugState(...args: unknown[]): void {
    if (this.debugStates) {
      this.debug('[State]', ...args);
    }
  }

  private readonly states = {
    waiting_for_app_init: {
      transition: async ({ action }: StateAction): Promise<void> => {
        if (action === 'app_initialized') {
          this.debugState('App initialized');
          return this.states.checking_initial_homey_devices.enter();
        }
        if (['device_connected', 'outbound_websocket_connected'].includes(action)) {
          // ignore
          return;
        }
        throw new Error(`Unknown transition for waiting_for_app_init: ${action}`);
      },
      enter: async (): Promise<void> => {
        throw new Error('Cannot enter waiting_for_app_init');
      },
    },
    checking_initial_homey_devices: {
      transition: async ({ action }: StateAction): Promise<void> => {
        if (['device_connected', 'outbound_websocket_connected'].includes(action)) {
          // ignore
          return;
        }
        throw new Error(`Unknown transition for checking_initial_homey_devices: ${action}`);
      },
      enter: async (): Promise<void> => {
        this.state = 'checking_initial_homey_devices';
        this.debugState('Checking initial Homey devices...');

        if (this.initialHomeyDeviceIds === undefined) {
          throw new Error('No initial Homey device ids specified.');
        }

        // Check if any Homey devices remain
        // TODO only look at driver devices once this.driver is guaranteed after 1.0.0
        const homeyDevices = [];
        for (const homeyDeviceId of this.initialHomeyDeviceIds) {
          const homeyDevice = this.app.getLocalDevice(homeyDeviceId);
          if (homeyDevice !== undefined) {
            homeyDevices.push(homeyDevice);
          }
        }

        this.initialHomeyDeviceIds = undefined;
        this.initialHomeyDevices = homeyDevices;
        this.debug('Found', homeyDevices.length, 'Homey devices');

        if (homeyDevices.length === 0) {
          // If not, remove this virtual device
          return this.states.uninitializing.enter();
        }
        // If yes, transition to configuring outbound WS connection
        return this.states.waiting_for_outbound_ws_connection.enter();
      },
    },
    waiting_for_outbound_ws_connection: {
      transition: async ({ action }: StateAction): Promise<void> => {
        if (action === 'outbound_websocket_connected') {
          this.debugState('Outbound websocket connection established');
          this.initRetries = 0;
          return this.states.initializing.enter();
        }
        if (action === 'device_connected') {
          // ignore
          return;
        }
        throw new Error(`Unknown transition for waiting_for_outbound_ws_connection: ${action}`);
      },
      enter: async (): Promise<void> => {
        this.state = 'waiting_for_outbound_ws_connection';
        this.debugState('Waiting for outbound websocket connection...');

        if (this.outboundWsRetries > MAX_STATE_RETRIES) {
          this.error(
            'Failed opening outbound websocket after too many retries, going to waiting_for_initial_connection',
          );
          return this.states.waiting_for_initial_connection.enter();
        }

        this.initialComponentResponses =
          (this.initialComponentResponses as ShellyGetComponentsResponseComponent[]) ??
          (await this.retrieveComponents());

        for (const component of this.initialComponentResponses) {
          if (component.key === 'ws') {
            const server = `wss://${await getIp(this.app.homey)}:${OUTBOUND_WS_PORT}`;
            const config = component.config as OutBoundWebsocketConfig;
            if (config.enable && config.server === server) {
              this.log('Outbound websocket already enabled');
              this.debugState('Continuing directly to waiting_for_initial_connection');
              this.initRetries = 0;
              return this.states.waiting_for_initial_connection.enter();
            } else {
              this.log('Enabling outbound websocket...');

              try {
                await SetConfig(this.getChannel(), { config: { ssl_ca: '*', enable: true, server: server } });
              } catch (err) {
                this.error('Error while configuring outbound websocket:', err);
                const retryDelay = 1000 * 2 ** (2 * this.outboundWsRetries);
                this.debugState(`Retrying in ${retryDelay / 1000} seconds...`);
                await new Promise(resolve => {
                  this.app.homey.setTimeout(resolve, retryDelay);
                });
                this.outboundWsRetries += 1;
                return this.states.waiting_for_outbound_ws_connection.enter();
              }

              await this.reboot().catch(err => this.debug('Error during Outbound WS reboot:', err));
              this.log('Enabled outbound websocket');
              return this.localConnection.waitForOutboundWsConnection();
            }
          }
        }

        this.log('No outbound websocket component found');
        this.debugState('Continuing directly to waiting_for_initial_connection');
        this.initRetries = 0;
        return this.states.waiting_for_initial_connection.enter();
      },
    },
    waiting_for_initial_connection: {
      transition: async ({ action }: StateAction): Promise<void> => {
        if (action === 'device_connected' || action === 'outbound_websocket_connected') {
          this.debugState('Initial connection established');
          this.outboundWsRetries = 0;
          return this.states.initializing.enter();
        } else {
          throw new Error(`Unknown transition for waiting_for_initial_connection: ${action}`);
        }
      },
      enter: async (): Promise<void> => {
        this.state = 'waiting_for_initial_connection';
        this.debugState('Waiting for initial connection...');

        if (this.initialHomeyDevices === undefined) {
          throw new Error('No initial Homey devices specified.');
        }

        await Promise.allSettled(
          this.initialHomeyDevices.map(homeyDevice =>
            homeyDevice
              .setUnavailable(this.app.homey.__('device.offline'))
              .catch(err =>
                this.error(
                  'Error while setting homey device to unavailable while waiting for initial connection:',
                  err,
                ),
              ),
          ),
        );
        this.localConnection.waitForConnection();
      },
    },
    initializing: {
      transition: async ({ action }: StateAction): Promise<void> => {
        if (['device_connected', 'outbound_websocket_connected'].includes(action)) {
          // ignore
          return;
        }
        throw new Error(`Unknown transition for initializing: ${action}`);
      },
      enter: async (): Promise<void> => {
        this.state = 'initializing';
        this.debugState('Initializing...');

        if (this.initRetries > MAX_STATE_RETRIES) {
          this.error('Failed initialization after too many retries');
          for (const shellyLocalDevice of this.initialHomeyDevices ?? []) {
            await shellyLocalDevice
              .setUnavailable(this.app.homey.__('device.initialization_error'))
              .catch(err => this.error('Error while setting device to unavailable due to failed retries:', err));
          }
          return;
        }

        try {
          await this.initialize();
        } catch (err) {
          if ((err as HttpError).code === 401 || err instanceof NoPassword) {
            for (const shellyLocalDevice of this.initialHomeyDevices ?? []) {
              await shellyLocalDevice
                .setUnavailable(this.app.homey.__('device.incorrect_password'))
                .catch(err => this.error('Error while setting device to unavailable due to incorrect password:', err));
            }
            return;
          }

          this.error('Error while initializing:', err);
          const retryDelay = 1000 * 2 ** (2 * this.initRetries);
          this.debugState(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => {
            this.app.homey.setTimeout(resolve, retryDelay);
          });
          this.initRetries += 1;
          return this.states.initializing.enter();
        }

        this.debugState('Initialized');
        return this.states.online.enter();
      },
    },
    online: {
      transition: async ({ action, ...args }: StateAction): Promise<void> => {
        if (action === 'device_connected' || action === 'outbound_websocket_connected') {
          return;
        }
        if (action === 'going_offline') {
          return this.states.offline.enter();
        }
        if (action === 'going_to_sleep') {
          return this.states.sleeping.enter();
        }
        if (action === 'removed_homey_device') {
          return this.states.removing_homey_device.enter(args.id!);
        }
        if (action === 'reinitialize') {
          return this.reInitialize();
        }
        throw new Error(`Unknown transition for online: ${action}`);
      },
      enter: async (): Promise<void> => {
        this.state = 'online';
        this.debugState('Device online');
        return this.setAvailable().catch(err =>
          this.error('Error while setting device to available because device came online:', err),
        );
      },
    },
    offline: {
      transition: async ({ action, ...args }: StateAction): Promise<void> => {
        if (action === 'device_connected' || action === 'outbound_websocket_connected') {
          return this.states.online.enter();
        }
        if (action === 'removed_homey_device') {
          return this.states.removing_homey_device.enter(args.id!);
        }
        if (action === 'reinitialize') {
          return this.reInitialize();
        }
        throw new Error(`Unknown transition for offline: ${action}`);
      },
      enter: async (): Promise<void> => {
        this.state = 'offline';
        this.debugState('Device offline');
        return this.setUnavailable(this.app.homey.__('device.offline')).catch(err =>
          this.error('Error while setting devices to unavailable because device came offline:', err),
        );
      },
    },
    sleeping: {
      transition: async ({ action, ...args }: StateAction): Promise<void> => {
        if (action === 'device_connected' || action === 'outbound_websocket_connected') {
          return this.states.online.enter();
        }
        if (action === 'removed_homey_device') {
          return this.states.removing_homey_device.enter(args.id!);
        }
        if (action === 'reinitialize') {
          return this.reInitialize();
        }
        throw new Error(`Unknown transition for sleeping: ${action}`);
      },
      enter: async (): Promise<void> => {
        this.state = 'sleeping';
        this.debugState('Device sleeping');
      },
    },
    error: {
      transition: async ({ action }: StateAction): Promise<void> => {
        if (['device_connected', 'outbound_websocket_connected'].includes(action)) {
          // ignore
          return;
        }
        throw new Error(`Unknown transition for error: ${action}`);
      },
      enter: async (message: string): Promise<void> => {
        this.state = 'error';
        this.error('Entered error state with error:', message);
        return this.setUnavailable(message).catch(err =>
          this.error('Error while setting devices to unavailable because of error:', err),
        );
      },
    },
    removing_homey_device: {
      transition: async ({ action }: StateAction): Promise<void> => {
        if (['device_connected', 'outbound_websocket_connected'].includes(action)) {
          // ignore
          return;
        }
        throw new Error(`Unknown transition for removing_homey_device: ${action}`);
      },
      enter: async (id: string): Promise<void> => {
        this.state = 'removing_homey_device';
        this.debugState('Removing Homey device:', id);

        this.initializedHomeyDevices.delete(id);
        const homeyDeviceCount = this.initializedHomeyDevices.size;
        this.log(homeyDeviceCount, 'children remaining');
        if (homeyDeviceCount > 0) {
          await this.app
            .updateVirtualDevice(this)
            .catch(err => this.error('Error while updating virtual device while removing Homey device:', err));
          return this.states.online.enter();
        }
        // Remove if no child devices remain
        await this.states.uninitializing.enter();
      },
    },
    uninitializing: {
      transition: async ({ action }: StateAction): Promise<void> => {
        if (['device_connected', 'outbound_websocket_connected'].includes(action)) {
          // ignore
          return;
        }
        throw new Error(`Unknown transition for uninitializing: ${action}`);
      },
      enter: async (): Promise<void> => {
        this.state = 'uninitializing';
        this.debugState('Uninitializing...');
        return this.unregister();
      },
    },
  } as const satisfies Record<StateName, State>;

  public transition(action: StateAction): Promise<void> {
    return this.states[this.state].transition(action).catch(err => this.error(err.message));
  }

  public serialize(): SerializedVirtualDevice {
    if (this.initializedHomeyDevices.size === 0) {
      throw new Error('No Homey devices initialized while saving virtual device');
    }
    return {
      deviceId: this.deviceId,
      ipAddress: this.localConnection.ipAddress,
      batteryDevice: this.batteryDevice,
      components: [...this.initializedComponents.keys()],
      driver: this.driver,
      homeyDeviceIds: [...this.initializedHomeyDevices.keys()],
      useHttps: this.localConnection.useHttps,
      ha1: this.localConnection.ha1,
      bleForwardScriptId: this.bleForwardScriptId,
    };
  }

  private reInitialize(): Promise<void> {
    this.initialHomeyDeviceIds = [...this.initializedHomeyDevices.keys()];
    this.initialHomeyDevices = this.app.homey.drivers.getDrivers()[this.driver].getDevices() as ShellyLocalDevice[];
    this.initialComponents = [...this.initializedComponents.keys()];
    this.initRetries = 0;
    return this.states.initializing.enter();
  }

  private async initialize(): Promise<void> {
    if (this.initialHomeyDevices === undefined) {
      throw new Error('No initial Homey devices defined');
    }
    if (this.initialComponents === undefined) {
      throw new Error('No initial components defined');
    }
    const homeyDevices: readonly ShellyLocalDevice[] = this.initialHomeyDevices;
    const oldComponents = this.initialComponents;

    // TODO remove this in 1.0.0
    // Before version 0.3.0 the Homey driver associated with the virtual device was not stored
    if (this.driver === undefined) {
      const homeyDevice = homeyDevices[0];
      await homeyDevice.ready();
      // @ts-expect-error this.driver is readonly
      this.driver = homeyDevice.driver.id;
    }

    // Mark Homey devices as initializing
    const markInitializingPromise = Promise.all(
      homeyDevices.map(homeyDevice => homeyDevice.setUnavailable(this.app.homey.__('device.offline'))),
    );

    const components =
      (this.initialComponentResponses as ShellyGetComponentsResponseComponent[]) ?? (await this.retrieveComponents());

    // Check which changes were made to the components since last time
    const newComponents = components.map(component => component.key);
    const { added: addedComponents, removed: removedComponents } = diffArrays(oldComponents, newComponents);

    this.debug('Removed components:', removedComponents);
    this.debug('Added components:', addedComponents);

    const methodMapping = await this.getMethodMapping();

    await this.initializeComponents(components);

    if (this.bleForwardScriptId !== null) {
      const forwardingScript = this.virtualComponents.get(`script:${this.bleForwardScriptId}`) as Script;
      if (this.bleForwardScript !== forwardingScript) {
        this.bleForwardScript?.scriptMitt.off('homey_ble_forward');

        this.debug('Handling BLE forwarding from script', this.bleForwardScriptId);
        forwardingScript.scriptMitt.on('homey_ble_forward', event => {
          this.app.btHomeServer.handleForward(event as BleForwardEventData);
        });

        this.bleForwardScript = forwardingScript;
      }
    }

    // Check whether changes to the components require adding/removing Homey devices
    const newDevices =
      (this.initialHomeyDeviceDefinitions as ShellyLocalListDeviceProperties[]) ??
      (await this.assembleDevices(components));

    const oldDeviceIds = homeyDevices.map(device => device.getTypedData().id);
    const newDeviceIds: string[] = newDevices.map(device => device.data.id);

    const { added: deviceIdsToAdd, removed: deviceIdsToRemove } = diffArrays(oldDeviceIds, newDeviceIds);

    this.debug('Homey devices to remove:', deviceIdsToRemove);
    this.debug('Homey devices not used:', deviceIdsToAdd);

    await markInitializingPromise;

    // Only initialize Homey devices that are still used.
    // Set the ones that are not to unavailable with a message saying they can be removed,
    // since we cannot do that ourselves.
    const usedDevices: ShellyLocalDevice[] = [];

    for (const homeyDevice of homeyDevices) {
      const id = homeyDevice.getTypedData().id;
      if (deviceIdsToRemove.includes(id)) {
        homeyDevice.setUnavailable(this.app.homey.__('device.device_removed')).catch(this.error);
        this.initializedHomeyDevices.delete(id);
      } else {
        usedDevices.push(homeyDevice);
      }
    }

    await this.initializeHomeyDevices(usedDevices, newDevices, methodMapping);

    this.initialHomeyDeviceIds = undefined;
    this.initialHomeyDevices = undefined;
    this.initialHomeyDeviceDefinitions = undefined;
    this.initialComponentResponses = undefined;
    this.initialComponents = undefined;

    await this.app.updateVirtualDevice(this);
    this.log('Initialized');
  }

  private async initializeComponents(components: ShellyGetComponentsResponseComponent[]): Promise<void> {
    for (const component of components) {
      if (this.initializedComponents.has(component.key)) {
        this.debug('Already registered component:', component.key);
        continue;
      }
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
        component.attrs,
      );
      this.initializedComponents.set(component.key, componentInstance);
    }
  }

  public async recreate(
    homeyDeviceDefinitions: ShellyLocalListDeviceProperties[],
    componentDefinitions: ShellyGetComponentsResponseComponent[],
    connectionSpecification?: ConnectionSpecification,
  ): Promise<void> {
    this.log('Recreating...');

    this.initialHomeyDeviceDefinitions = homeyDeviceDefinitions;
    this.initialComponentResponses = componentDefinitions;
    this.initialHomeyDeviceIds = homeyDeviceDefinitions.map(device => device.data.id);

    const driverDevices = this.app.homey.drivers.getDrivers()[this.driver].getDevices() as ShellyLocalDevice[];
    const driverDevicesById: Record<string, ShellyLocalDevice> = {};
    driverDevices.forEach(device => (driverDevicesById[device.getTypedData().id] = device));

    this.initialHomeyDevices = homeyDeviceDefinitions.map(definition => driverDevicesById[definition.data.id]);
    this.initialComponents = componentDefinitions.map(component => component.key);

    if (
      connectionSpecification !== undefined &&
      (this.localConnection.ipAddress !== connectionSpecification.ipAddress ||
        this.localConnection.useHttps !== connectionSpecification.useHttps ||
        this.localConnection.ha1 !== connectionSpecification.ha1)
    ) {
      await this.reconnect(connectionSpecification);
      return this.states.waiting_for_initial_connection.enter();
    }

    this.initRetries = 0;
    return this.states.initializing.enter();
  }

  public async onComponentAdded(newComponentId: string): Promise<void> {
    this.log(`Added ${newComponentId}`);

    if (this.initializedHomeyDevices.size === 0) {
      throw new Error('No Homey devices initialized while adding component');
    }

    return this.transition({ action: 'reinitialize' });
  }

  public async onComponentRemoved(componentId: string): Promise<void> {
    this.log(`Removed ${componentId}`);

    if (this.initializedHomeyDevices.size === 0) {
      throw new Error('No Homey devices initialized while removing component');
    }

    return this.transition({ action: 'reinitialize' });
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
        useHttps: this.localConnection.useHttps,
      },
      store: {
        address: this.localConnection.ipAddress,
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

  private async retrieveComponents(keys?: string[]): Promise<ShellyGetComponentsResponseComponent[]> {
    const components: ShellyGetComponentsResponseComponent[] = [];
    while (true) {
      const componentsResponse = await Shelly.GetComponents(this.localConnection.httpChannel, {
        offset: components.length,
        keys: keys,
      });
      components.push(...componentsResponse.result.components);
      if (components.length >= componentsResponse.result.total) {
        break;
      }
    }
    return components;
  }

  public async disconnect(): Promise<void> {
    return this.localConnection.disconnect();
  }

  public async reconnect(connectionSpecification: ConnectionSpecification): Promise<void> {
    return this.localConnection.reconnect(connectionSpecification);
  }

  public getChannel(): RpcChannel {
    return this.localConnection.getChannel();
  }

  private async getMethodMapping(): Promise<Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>> {
    const methodsResponse = await Shelly.ListMethods(this.localConnection.httpChannel);
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
    await Shelly.Reboot(this.getChannel(), { delay_ms: initialWaitTime });
  }

  private async unregister(): Promise<void> {
    try {
      await this.disconnect();
    } finally {
      await this.app.removeVirtualDevice(this);
      this.log('Uninitialized');
    }
  }

  private handleWsNotification(notification: NotificationFrame): void {
    void this.transition({ action: 'device_connected' });

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
        void this.transition({ action: 'going_offline' });
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

  public async updateDeviceInformationSettings(serializedVirtualDevice: SerializedVirtualDevice): Promise<void> {
    const promises = [];
    for (const homeyDevice of this.initializedHomeyDevices.values()) {
      promises.push(
        homeyDevice.setSettings({
          _shelly_device_id: serializedVirtualDevice.deviceId,
          _shelly_ip: serializedVirtualDevice.ipAddress,
        }),
      );
    }
    await Promise.all(promises);
  }
}

class LocalConnection {
  public httpChannel!: HttpChannel;
  private inboundWsChannel?: InboundWebsocketChannel;
  private outboundWsChannel?: OutboundWebsocketChannel;

  private state: 'waiting_for_initial_connection' | 'open' = 'waiting_for_initial_connection';
  private outbound_ws_state: 'waiting_for_initial_connection' | 'open' = 'waiting_for_initial_connection';

  public get useHttps(): boolean {
    return this.httpChannel.useHttps;
  }

  public constructor(
    private virtualDevice: VirtualDevice,
    private handleWsNotification: (notification: NotificationFrame) => void,
    public ipAddress: string,
    useHttps: boolean,
    public ha1: string | null,
  ) {
    this.connect(useHttps);
  }

  public waitForConnection(): void {
    // If the virtual device opens the connection while we are already connected, we signal immediately
    if (this.state === 'open') {
      void this.virtualDevice.transition({ action: 'device_connected' });
    }
    // If the virtual device opens the connection while not yet connected, we just wait for the signal normally
  }

  public waitForOutboundWsConnection(): void {
    // If the virtual device opens the connection while we are already connected, we signal immediately
    if (this.outbound_ws_state === 'open') {
      void this.virtualDevice.transition({ action: 'outbound_websocket_connected' });
    }
    // If the virtual device opens the connection while not yet connected, we just wait for the signal normally
  }

  public getChannel(): RpcChannel {
    // For sending, prefer inbound WS channel > httpChannel > outbound WS channel
    if (this.inboundWsChannel !== undefined && this.inboundWsChannel.ws.readyState === WebSocket.OPEN) {
      return this.inboundWsChannel;
    }

    return this.httpChannel;
  }

  public connect(useInitialHttps: boolean): void {
    this.state = 'waiting_for_initial_connection';
    this.outbound_ws_state = 'waiting_for_initial_connection';

    this.httpChannel = createHttpChannel(
      this.ipAddress,
      this.virtualDevice.app.homey.__,
      useInitialHttps,
      this.ha1,
      this.onHttpsUpgrade.bind(this),
    );

    if (useInitialHttps) {
      this.virtualDevice.log('Using HTTPS');
    }

    if (!this.virtualDevice.batteryDevice) {
      this.inboundWsChannel = createInboundWsChannel(
        this.virtualDevice.app,
        this.ipAddress,
        this.virtualDevice.log,
        this.virtualDevice.error,
        useInitialHttps,
        this.ha1,
        this.onHttpsUpgrade.bind(this),
      );
      // handleWsNotification should already be bound by virtual device
      this.inboundWsChannel.eventEmitter.on('notification', this.handleWsNotification.bind(this));
      this.inboundWsChannel.eventEmitter.on('opened', () => {
        this.handleDeviceConnected();
      });
    }

    this.outboundWsChannel = createOutboundWsChannel(
      this.virtualDevice.app,
      this.virtualDevice.deviceId,
      this.virtualDevice.app.outboundWsServer.outboundWsMitt,
      this.virtualDevice.log,
      this.virtualDevice.error,
    );
    this.outboundWsChannel.eventEmitter.on('notification', this.handleOutboundWsNotification.bind(this));
    this.outboundWsChannel.eventEmitter.on('opened', () => {
      this.inboundWsChannel?.resetReconnectTimeout();
      this.inboundWsChannel?.safeConnect();
      this.outbound_ws_state = 'open';
      void this.virtualDevice.transition({ action: 'outbound_websocket_connected' });
      this.handleDeviceConnected();
    });
  }

  public async disconnect(): Promise<void> {
    this.inboundWsChannel?.disconnect();
    this.outboundWsChannel?.disconnect();
  }

  public async reconnect(connectionSpecification: ConnectionSpecification): Promise<void> {
    await this.disconnect();
    this.ipAddress = connectionSpecification.ipAddress;
    if (connectionSpecification.ha1 !== undefined) {
      this.ha1 = connectionSpecification.ha1;
    }
    // Ideally, the connection specification would be persisted using app.updateVirtualDevice,
    // but since the virtual device may not actually be initialized yet, this is not always available.
    // The worst that could happen is the new config not being saved before the app is restarted,
    // In which case the connection will just be reset once during startup.
    this.connect(connectionSpecification.useHttps);
  }

  private handleDeviceConnected(): void {
    this.state = 'open';
    void this.virtualDevice.transition({ action: 'device_connected' });
  }

  private handleOutboundWsNotification(notification: NotificationFrame): void {
    if (!(this.inboundWsChannel === undefined || this.inboundWsChannel.ws.readyState !== WebSocket.OPEN)) {
      return;
    }

    this.handleWsNotification(notification);
  }

  private async onHttpsUpgrade(): Promise<void> {
    this.httpChannel.useHttps = true;
    await this.virtualDevice.app.updateVirtualDevice(this.virtualDevice);
  }
}
