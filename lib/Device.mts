import Homey from 'homey';
import type { ShellyLocalDeviceData, ShellyLocalDeviceStore } from './types.mjs';
import type ShellyApp from '../app.mjs';
import type { VirtualDevice } from './VirtualDevice.mjs';
import type { ComponentMethod, NameSpace } from './component/components/Shelly/ListMethods.mjs';
import type { MappedComponent } from './component/ComponentMapping.mjs';
import type ShellyLocalDriver from './Driver.mjs';

export default class ShellyLocalDevice extends Homey.Device {
  declare readonly __id: string;
  virtualDevice?: VirtualDevice;
  virtualComponents = new Map<string, InstanceType<MappedComponent>>();

  async onInit(): Promise<void> {
    await this.setUnavailable(this.homey.__('device.initializing'));
    this.registerCapabilityListener('button.restart', () => {
      if (this.virtualDevice === undefined) {
        throw new Error(this.homey.__('device.not_connected'));
      }
      return this.virtualDevice.reboot({ awaitRestart: false });
    });
  }

  async onDeleted(): Promise<void> {
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
  async initializeShelly(
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
      this.virtualComponents.set(componentId, virtualComponent);
      await virtualComponent.registerHomeyDevice(this, (methodMapping[virtualComponent.namespace] ?? []) as never);
    }

    this.log(this.getName(), 'initialized');
    await this.setAvailable();
  }

  get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  async safeAddCapability(id: string): Promise<void> {
    if (this.hasCapability(id)) {
      return;
    }

    await this.addCapability(id).catch(this.error);
  }

  getTypedStore(): ShellyLocalDeviceStore {
    return this.getStore();
  }

  getTypedData(): ShellyLocalDeviceData {
    return this.getData();
  }

  async safeRemoveCapability(id: string): Promise<void> {
    if (!this.hasCapability(id)) {
      return;
    }

    await this.removeCapability(id).catch(this.error);
  }

  async safeSetCapability(id: string, value: unknown): Promise<void> {
    if (!this.hasCapability(id)) {
      return;
    }

    await this.setCapabilityValue(id, value).catch(this.error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async onSettings(event: SettingsEvent<any>): Promise<string | void> {
    let restartRequired = false;
    for (const virtualComponent of this.virtualComponents.values()) {
      restartRequired ||= await virtualComponent.handleSettings(this, event as never);
    }
    if (restartRequired) {
      return this.homey.__('device.requires_restart');
    }
  }

  debug(...args: unknown[]): void {
    (this.driver as ShellyLocalDriver).debug(`[Device:${this.__id}]`, ...args);
  }
}
