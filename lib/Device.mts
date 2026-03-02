import Homey from 'homey';
import type { ShellyLocalDeviceData, ShellyLocalDeviceStore } from './types.mjs';
import type ShellyApp from '../app.mjs';
import type { VirtualDevice } from './VirtualDevice.mjs';
import type { ComponentMethod, NameSpace } from './component/components/Shelly/ListMethods.mjs';
import type { NotificationEventFrame, NotificationFrame, NotificationStatusFrame } from './rpc/Rpc.mjs';
import WebSocket from 'ws';
import type { MappedComponent } from './component/ComponentMapping.mjs';

export default class ShellyLocalDevice extends Homey.Device {
  virtualDevice?: VirtualDevice;
  virtualComponents = new Map<string, InstanceType<MappedComponent>>();

  async onInit(): Promise<void> {
    // TODO translate
    await this.setUnavailable('Initializing...');
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

    virtualDevice.inboundWsChannel?.registerNotificationHandler(this, this.handleWsNotification.bind(this));
    virtualDevice.outboundWsChannel?.registerNotificationHandler(this, this.handleOutboundWsNotification.bind(this));

    this.log(this.getName(), 'initialized');
    await this.setAvailable();
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
        this.virtualComponents
          .get(component)
          ?.updateStatus(this, statusUpdate as never)
          .catch(this.error);
      }
    } else if (notification.method === 'NotifyEvent') {
      const eventNotification = notification as NotificationEventFrame;
      for (const event of eventNotification.params.events) {
        this.virtualComponents.get(event.component)?.handleEvent(this, event).catch(this.error);
      }
    } else {
      this.log('Unhandled WS notification method:', notification.method);
    }
  }

  handleOutboundWsNotification(notification: NotificationFrame): void {
    if (this.virtualDevice === undefined) {
      return;
    }
    // Ignore outbound WS messages if an inbound WS is open
    if (
      this.virtualDevice.inboundWsChannel === undefined ||
      this.virtualDevice.inboundWsChannel.ws.readyState !== WebSocket.OPEN
    ) {
      this.handleWsNotification(notification);
    }
  }

  get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  async safeAddCapability(id: string): Promise<void> {
    if (!this.hasCapability(id)) {
      await this.addCapability(id).catch(this.error);
    }
  }

  getTypedStore(): ShellyLocalDeviceStore {
    return this.getStore();
  }

  getTypedData(): ShellyLocalDeviceData {
    return this.getData();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async onSettings(event: SettingsEvent<any>): Promise<string | void> {
    for (const virtualComponent of this.virtualComponents.values()) {
      await virtualComponent.handleSettings(this, event);
    }
  }
}
