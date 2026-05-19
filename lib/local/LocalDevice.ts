import Homey from 'homey';
import type { ShellyLocalDeviceData, ShellyLocalDeviceStore } from '../types.js';
import type ShellyApp from '../../app.js';
import { IGNORED_NO_IMPLEMENTATION_COMPONENTS, type VirtualDevice } from '../VirtualDevice.js';
import type { ComponentMethod, NameSpace } from '../component/components/Shelly/ListMethods.js';
import { ComponentMapping, type MappedComponent } from '../component/ComponentMapping.js';
import type ShellyLocalDriver from './LocalDriver.js';
import { diffArrays } from '../util.js';

export default class ShellyLocalDevice extends Homey.Device {
  declare public readonly __id: string;
  public virtualDevice?: VirtualDevice;
  public readonly virtualComponents = new Map<string, InstanceType<MappedComponent>>();
  public readonly componentCounts = new Map<NameSpace, number>();

  public async onInit(): Promise<void> {
    await this.setUnavailable(this.homey.__('device.initializing'));
    this.registerCapabilityListener('button.restart', () => {
      if (this.virtualDevice === undefined) {
        throw new Error(this.homey.__('device.not_connected'));
      }
      return this.virtualDevice.reboot();
    });
  }

  public async onDeleted(): Promise<void> {
    if (this.virtualDevice !== undefined) {
      this.virtualDevice.removeHomeyDevice(this.getTypedData().id).catch(console.error);
    } else {
      this.error('Removed without a virtual device.');
      // NOTE: In theory, a data race could happen here if the device is removed while the app is still starting.
      // The worst that happens is a virtual device that is not cleaned up until the next restart,
      // though it may log a lot of errors.
    }
  }

  // This is called by the parent virtual device
  public async initializeShelly(
    virtualDevice: VirtualDevice,
    newComponents: string[],
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
    this.virtualDevice = virtualDevice;
    await this.ready();

    const oldComponents = this.getTypedStore().components;
    const { added: addedComponents, removed: removedComponents } = diffArrays(oldComponents, newComponents);

    this.debug('Removed components:', removedComponents);
    this.debug('Added components:', addedComponents);

    // Remove before adding, to avoid capability conflicts
    for (const removedComponent of removedComponents) {
      const [componentName, componentIdString] = removedComponent.split(':') as [string, `${number}` | undefined];
      const componentConstructor = ComponentMapping[componentName as never] as MappedComponent | undefined;
      if (componentConstructor === undefined) {
        continue;
      }
      const componentId = componentIdString !== undefined ? parseInt(componentIdString) : componentIdString;
      await componentConstructor.unregisterHomeyDevice(this, componentId);
    }
    await this.registerComponents(newComponents, methodMapping);
    await this.setTypedStoreValue('components', newComponents);

    this.log(this.getName(), 'initialized');
    await this.setAvailable();
  }

  public async addComponent(
    componentId: string,
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
    this.log(`Adding ${componentId}...`);
    await this.registerComponents([componentId], methodMapping);
    const oldComponents = this.getTypedStore().components;
    await this.setTypedStoreValue('components', [...oldComponents, componentId]);
    this.log('Added', componentId);
  }

  public async removeComponent(
    componentId: string,
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
    this.log(`Removing ${componentId}...`);
    const removedComponent = this.virtualComponents.get(componentId);
    if (removedComponent === undefined) {
      return;
    }
    await removedComponent.unregisterHomeyDevice(this);
    this.virtualComponents.delete(componentId);
    this.componentCounts.set(
      removedComponent.namespace,
      (this.componentCounts.get(removedComponent.namespace) ?? 1) - 1,
    );

    // Re-register so multi-component capabilities are fixed
    for (const virtualComponent of this.virtualComponents.values()) {
      await virtualComponent.registerHomeyDevice(this, (methodMapping[virtualComponent.namespace] ?? []) as never);
      await virtualComponent.setInitialValues(this);
    }

    const oldComponents = this.getTypedStore().components;
    await this.setTypedStoreValue(
      'components',
      oldComponents.filter(oldComponentId => oldComponentId !== componentId),
    );
    this.log('Removed', componentId);
  }

  private async registerComponents(
    newComponents: string[],
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
    for (const componentId of newComponents) {
      if (this.virtualComponents.has(componentId)) {
        this.log('Already registered component:', componentId);
        continue;
      }
      const virtualComponent = this.virtualDevice!.virtualComponents.get(componentId);
      if (virtualComponent === undefined) {
        const [componentName] = componentId.split(':') as [string, `${number}` | undefined];
        if (!IGNORED_NO_IMPLEMENTATION_COMPONENTS.includes(componentName)) {
          this.error('No virtual component found for', componentId);
        }
        continue;
      }
      this.componentCounts.set(
        virtualComponent.namespace,
        (this.componentCounts.get(virtualComponent.namespace) ?? 0) + 1,
      );
      this.virtualComponents.set(componentId, virtualComponent);
    }

    for (const virtualComponent of this.virtualComponents.values()) {
      await virtualComponent.registerHomeyDevice(this, (methodMapping[virtualComponent.namespace] ?? []) as never);
      await virtualComponent.setInitialValues(this);
    }
  }

  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  public getTypedStore(): ShellyLocalDeviceStore {
    return this.getStore();
  }

  public setTypedStoreValue<Key extends keyof ShellyLocalDeviceStore>(
    key: Key,
    value: ShellyLocalDeviceStore[Key],
  ): Promise<void> {
    return this.setStoreValue(key, value);
  }

  public getTypedData(): ShellyLocalDeviceData {
    return this.getData();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async onSettings(event: SettingsEvent<any>): Promise<string | void> {
    let restartRequired = false;
    for (const virtualComponent of this.virtualComponents.values()) {
      restartRequired ||= await virtualComponent.handleSettings(this, event as never);
    }
    if (restartRequired) {
      return this.homey.__('device.requires_restart');
    }
  }

  public async setComponentSettings(
    component: NameSpace,
    id: number | undefined,
    settings: Record<string, unknown>,
  ): Promise<void> {
    await this.setSettings(settings);
  }

  public debug(...args: unknown[]): void {
    (this.driver as ShellyLocalDriver).debug(`[Device:${this.__id}]`, ...args);
  }
}
