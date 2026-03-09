import { Log } from '@drenso/homey-log';
import Homey from 'homey';
import sourceMapSupport from 'source-map-support';
import { getIp } from './lib/LocalIp.mjs';
import OutboundWsServer from './lib/rpc/OutboundWsServer.mjs';
import { VirtualDevice, type SerializedVirtualDevice } from './lib/VirtualDevice.mjs';
import type ShellyLocalDevice from './lib/Device.mjs';
import type Input from './lib/component/components/Input.mjs';

sourceMapSupport.install();

const VIRTUAL_DEVICE_IDS_SETTING_KEY = 'virtual_device_ids';
const VIRTUAL_DEVICE_SETTING_KEY_PREFIX = 'virtual_device_';

// noinspection JSUnusedGlobalSymbols
export default class ShellyApp extends Homey.App {
  homeyLog = new Log({ homey: this.homey });
  outboundWsServer = new OutboundWsServer(this.log, this.error);

  virtualDevices = new Map<string, VirtualDevice>();

  async onInit(): Promise<void> {
    this.log('Initializing App...');
    this.outboundWsServer.open(await getIp(this.homey));
    await this.registerFlowCards();
    await this.deserializeVirtualDevices();
    this.log('Finished initializing App');
  }

  async deserializeVirtualDevices(): Promise<void> {
    const virtualDeviceIds = this.homey.settings.get(VIRTUAL_DEVICE_IDS_SETTING_KEY) ?? ([] as readonly string[]);
    for (const virtualDeviceId of virtualDeviceIds) {
      const { deviceId, ipAddress, components, homeyDeviceIds, ha1 } = this.homey.settings.get(
        VIRTUAL_DEVICE_SETTING_KEY_PREFIX + virtualDeviceId,
      ) as SerializedVirtualDevice;
      const virtualDevice = new VirtualDevice(this, deviceId, ipAddress, components, homeyDeviceIds as string[], ha1);
      this.virtualDevices.set(virtualDeviceId, virtualDevice);
    }
  }

  async addVirtualDevice(device: VirtualDevice): Promise<void> {
    this.virtualDevices.set(device.deviceId, device);
    const virtualDeviceIds: readonly string[] = [...this.virtualDevices.keys()];
    this.homey.settings.set(VIRTUAL_DEVICE_IDS_SETTING_KEY, virtualDeviceIds);
    const deviceSettingKey = VIRTUAL_DEVICE_SETTING_KEY_PREFIX + device.deviceId;
    this.homey.settings.set(deviceSettingKey, device.serialize());
  }

  async removeVirtualDevice(device: VirtualDevice): Promise<void> {
    this.virtualDevices.delete(device.deviceId);
    const virtualDeviceIds: readonly string[] = [...this.virtualDevices.keys()];
    this.homey.settings.set(VIRTUAL_DEVICE_IDS_SETTING_KEY, virtualDeviceIds);
    const deviceSettingKey = VIRTUAL_DEVICE_SETTING_KEY_PREFIX + device.deviceId;
    this.homey.settings.unset(deviceSettingKey);
  }

  async updateVirtualDevice(device: VirtualDevice): Promise<void> {
    const deviceSettingKey = VIRTUAL_DEVICE_SETTING_KEY_PREFIX + device.deviceId;
    this.homey.settings.set(deviceSettingKey, device.serialize());
  }

  getDevice(id: string): ShellyLocalDevice | undefined {
    const drivers = this.homey.drivers.getDrivers();
    for (const driverId in drivers) {
      const driver = drivers[driverId];
      const devices = driver.getDevices() as ShellyLocalDevice[];
      for (const device of devices) {
        if (device.getTypedData().id === id) {
          return device;
        }
      }
    }
    return undefined;
  }

  async registerFlowCards(): Promise<void> {
    this.homey.flow
      .getDeviceTriggerCard('input_multiple_switch_event')
      .registerArgumentAutocompleteListener(
        'switch',
        (query, { value, device }: { value: boolean; device: ShellyLocalDevice }) => {
          if (device.virtualDevice === undefined) {
            return [];
          }

          const switchInputs = device.virtualDevice.getInputTypes()['switch'];

          const deviceSwitchInputs: Input[] = [];
          for (const inputId of switchInputs) {
            const inputComponent = device.virtualComponents.get(inputId) as Input | undefined;
            if (inputComponent !== undefined) {
              deviceSwitchInputs.push(inputComponent);
            }
          }
          return deviceSwitchInputs.map(input => ({
            name: input.config.name ?? `Input ${input.id + 1}`,
            id: input.id,
          }));
        },
      );
  }

  debug(...args: unknown[]): void {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', ...args);
    }
  }
}
