import { Log } from '@drenso/homey-log';
import Homey from 'homey';
import sourceMapSupport from 'source-map-support';
import type { MultiZoneCapabilityDeviceInterface } from './lib/capabilityInterfaces.js';
import ShellyLocalDriver from './lib/local/LocalDriver.js';
import { getIp } from './lib/LocalIp.js';
import OutboundWsServer from './lib/rpc/OutboundWsServer.js';
import { type SerializedVirtualDevice, VirtualDevice } from './lib/VirtualDevice.js';
import type ShellyLocalDevice from './lib/local/LocalDevice.js';
import Input from './lib/component/components/Input.js';
import Illuminance from './lib/component/components/Illuminance.js';
import PresenceZone from './lib/component/components/PresenceZone.js';

sourceMapSupport.install();

const VIRTUAL_DEVICE_IDS_SETTING_KEY = 'virtual_device_ids';
const VIRTUAL_DEVICE_SETTING_KEY_PREFIX = 'virtual_device_';

// noinspection JSUnusedGlobalSymbols
export default class ShellyApp extends Homey.App {
  public readonly homeyLog = new Log({ homey: this.homey });
  public readonly outboundWsServer = new OutboundWsServer(this.log, this.error);

  public readonly virtualDevices = new Map<string, VirtualDevice>();

  public async onInit(): Promise<void> {
    this.log('Initializing App...');

    await getIp(this.homey)
      .then(ip => {
        this.outboundWsServer.open(ip);
      })
      .catch(() => {
        this.log('Running in the cloud, no outbound WS server started.');
      });

    this.registerFlowCards();
    await this.deserializeVirtualDevices();
    this.log('Finished initializing App');
  }

  private async deserializeVirtualDevices(): Promise<void> {
    const virtualDeviceIds = this.homey.settings.get(VIRTUAL_DEVICE_IDS_SETTING_KEY) ?? ([] as readonly string[]);
    for (const virtualDeviceId of virtualDeviceIds) {
      const { deviceId, ipAddress, batteryDevice, components, driver, homeyDeviceIds, useHttps, ha1 } =
        this.homey.settings.get(VIRTUAL_DEVICE_SETTING_KEY_PREFIX + virtualDeviceId) as SerializedVirtualDevice;
      const virtualDevice = new VirtualDevice(
        this,
        deviceId,
        ipAddress,
        // TODO remove this migration in 1.0.0
        batteryDevice ?? false,
        components,
        driver,
        homeyDeviceIds as string[],
        // TODO remove this migration in 1.0.0
        useHttps ?? false,
        ha1,
      );
      this.virtualDevices.set(virtualDeviceId, virtualDevice);
    }
  }

  public async addVirtualDevice(device: VirtualDevice): Promise<void> {
    this.virtualDevices.set(device.deviceId, device);
    const virtualDeviceIds: readonly string[] = [...this.virtualDevices.keys()];
    this.homey.settings.set(VIRTUAL_DEVICE_IDS_SETTING_KEY, virtualDeviceIds);
    const deviceSettingKey = VIRTUAL_DEVICE_SETTING_KEY_PREFIX + device.deviceId;
    this.homey.settings.set(deviceSettingKey, device.serialize());
  }

  public async removeVirtualDevice(device: VirtualDevice): Promise<void> {
    this.virtualDevices.delete(device.deviceId);
    const virtualDeviceIds: readonly string[] = [...this.virtualDevices.keys()];
    this.homey.settings.set(VIRTUAL_DEVICE_IDS_SETTING_KEY, virtualDeviceIds);
    const deviceSettingKey = VIRTUAL_DEVICE_SETTING_KEY_PREFIX + device.deviceId;
    this.homey.settings.unset(deviceSettingKey);
  }

  public async updateVirtualDevice(device: VirtualDevice): Promise<void> {
    const deviceSettingKey = VIRTUAL_DEVICE_SETTING_KEY_PREFIX + device.deviceId;
    this.homey.settings.set(deviceSettingKey, device.serialize());
  }

  public getLocalDevice(id: string): ShellyLocalDevice | undefined {
    const drivers = this.homey.drivers.getDrivers();
    for (const driverId in drivers) {
      const driver = drivers[driverId];
      if (!(driver instanceof ShellyLocalDriver)) {
        continue;
      }

      const devices = driver.getDevices() as ShellyLocalDevice[];
      for (const device of devices) {
        if (device.getTypedData().id === id) {
          return device;
        }
      }
    }
    return undefined;
  }

  public debug(...args: unknown[]): void {
    if (Homey.env['DEBUG'] === '1') {
      console.log(new Date(), '[dbg]', '[ShellyApp]', ...args);
    }
  }

  private registerFlowCards(): void {
    Input.registerFlowCards(this);
    Illuminance.registerFlowCards(this);
    PresenceZone.registerFlowCards(this);

    const alarmPresenceZoneRunListener = async (
      args: { zones: string[] },
      state: { zone: number },
    ): Promise<boolean> => {
      return args.zones.map(z => Number(z)).includes(state.zone);
    };
    this.homey.flow
      .getDeviceTriggerCard('alarm_presence_zone_x_false')
      .registerRunListener(alarmPresenceZoneRunListener);
    this.homey.flow
      .getDeviceTriggerCard('alarm_presence_zone_x_true')
      .registerRunListener(alarmPresenceZoneRunListener);
    this.homey.flow
      .getConditionCard('alarm_presence_zone_x_has')
      .registerRunListener((args: { zones: string[]; device: MultiZoneCapabilityDeviceInterface }) => {
        return args.zones.some(zone => args.device.isZoneOccupied(Number(zone)));
      });
  }
}
