import Homey from 'homey';
import type { ShellyLocalDeviceData, ShellyLocalDeviceStore } from '../types.mjs';
import type ShellyApp from '../../app.mjs';
import { IGNORED_NO_IMPLEMENTATION_COMPONENTS, type VirtualDevice } from '../VirtualDevice.mjs';
import type { ComponentMethod, NameSpace } from '../component/components/Shelly/ListMethods.mjs';
import { ComponentMapping, type MappedComponent } from '../component/ComponentMapping.mjs';
import type ShellyLocalDriver from './LocalDriver.mjs';
import { diffArrays } from '../util.mjs';

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
      return this.virtualDevice.reboot({ awaitRestart: false });
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
    }
  }

  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  public async safeAddCapability(id: string): Promise<void> {
    if (this.hasCapability(id)) {
      return;
    }

    await this.addCapability(id).catch(this.error);
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

  public async safeRemoveCapability(id: string): Promise<void> {
    if (!this.hasCapability(id)) {
      return;
    }

    await this.removeCapability(id).catch(this.error);
  }

  public async safeSetCapability(id: string, value: unknown): Promise<void> {
    if (!this.hasCapability(id)) {
      return;
    }

    await this.setCapabilityValue(id, value).catch(this.error);
  }

  public async safeTriggerDeviceCard(
    id: string,
    tokens?: Record<string, unknown>,
    triggerArgs?: Record<string, unknown>,
  ): Promise<void> {
    return this.homey.flow.getDeviceTriggerCard(id).trigger(this, tokens, triggerArgs).catch(this.error);
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
