import Homey from 'homey';
import type { ShellyLocalDeviceData, ShellyLocalDeviceStore } from '../types.mjs';
import type ShellyApp from '../../app.mjs';
import type { VirtualDevice } from '../VirtualDevice.mjs';
import type { ComponentMethod, NameSpace } from '../component/components/Shelly/ListMethods.mjs';
import type { MappedComponent } from '../component/ComponentMapping.mjs';
import type ShellyLocalDriver from './LocalDriver.mjs';

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
      await this.virtualDevice.removeHomeyDevice(this.getTypedData().id);
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
    methodMapping: Partial<Record<NameSpace, ComponentMethod<NameSpace>[]>>,
  ): Promise<void> {
    this.virtualDevice = virtualDevice;
    await this.ready();

    for (const componentId of this.getTypedStore().components) {
      const virtualComponent = this.virtualDevice.virtualComponents.get(componentId);
      if (virtualComponent === undefined) {
        // TODO unregister
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

    this.log(this.getName(), 'initialized');
    await this.setAvailable();
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
