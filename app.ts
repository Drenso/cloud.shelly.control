import { Log } from '@drenso/homey-log';
import Homey, { type DiscoveryResultMDNSSD } from 'homey';
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
import { createHttpChannel } from './lib/HomeyRPCChannels.js';
import Shelly from './lib/component/components/Shelly.js';
import NumberComponent from './lib/component/components/Number.js';
import Boolean from './lib/component/components/Boolean.js';
import Button from './lib/component/components/Button.js';

// TODO remove in 1.0.0
process.on('uncaughtException', (error, origin) => {
  console.error('Uncaught exception:', error, '\nfrom', origin);
});

sourceMapSupport.install();

const VIRTUAL_DEVICE_IDS_SETTING_KEY = 'virtual_device_ids';
const VIRTUAL_DEVICE_SETTING_KEY_PREFIX = 'virtual_device_';

// noinspection JSUnusedGlobalSymbols
export default class ShellyApp extends Homey.App {
  public readonly homeyLog = new Log({ homey: this.homey });
  public readonly outboundWsServer = new OutboundWsServer(this.log, this.error);

  public readonly virtualDevices = new Map<string, VirtualDevice>();

  public readonly localDriverResolvers: Record<string, () => void>;
  public readonly localDriversReady: Promise<void>;

  public readonly expectedHomeyDeviceIds: string[] = [];

  public constructor(...args: Array<never>) {
    super(...args);

    this.localDriverResolvers = {};
    const localDriversReadyPromises: Array<Promise<void>> = [];

    // Dynamically get the names of local drivers based on their suffix
    const localDriverNames = this.manifest.drivers
      .map((driver: { id: string }) => driver.id)
      .filter((id: string) => id.endsWith('local'));

    for (const driverName of localDriverNames) {
      localDriversReadyPromises.push(
        new Promise<void>(resolve => {
          this.localDriverResolvers[driverName] = resolve;
        }),
      );
    }
    this.localDriversReady = Promise.all(localDriversReadyPromises).then();

    this.deserializeVirtualDevices();
    this.setupVirtualDeviceRediscovery().catch(err =>
      this.error('Error while setting up virtual device rediscovery:', err),
    );
  }

  public async onInit(): Promise<void> {
    this.log('Initializing App...');

    await getIp(this.homey)
      .then(ip => {
        this.outboundWsServer.open(ip);
      })
      .catch(err => {
        if (err === 'Invalid Event: getLocalAddress') {
          this.log('Running in the cloud, no outbound WS server started.');
        } else {
          this.error('Error while getting local IP for outbound WS server:', err);
        }
      });

    this.registerFlowCards();
    // Wait for local drivers to be ready to avoid a race condition
    this.localDriversReady.then(() => {
      this.log('Finished initializing App');
    });
  }

  private deserializeVirtualDevices(): void {
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
        // TODO remove this migration in 1.0.0
        ha1 ?? null,
      );
      this.virtualDevices.set(virtualDeviceId, virtualDevice);
      this.expectedHomeyDeviceIds.push(...homeyDeviceIds);
    }
  }

  private async setupVirtualDeviceRediscovery(): Promise<void> {
    const discoveryStrategy = this.homey.discovery.getStrategy('shelly');

    discoveryStrategy.on('result', discoveryResult => this.handleRediscovery(discoveryResult));

    const initialDiscoveryResults = discoveryStrategy.getDiscoveryResults() as Record<string, DiscoveryResultMDNSSD>;
    for (const initialDiscoveryResultsKey in initialDiscoveryResults) {
      await this.handleRediscovery(initialDiscoveryResults[initialDiscoveryResultsKey]);
    }
  }

  private async handleRediscovery({ address: newAddress }: DiscoveryResultMDNSSD): Promise<void> {
    try {
      const httpChannel = createHttpChannel(newAddress, this.homey.__, false);
      const deviceInfoResponse = await Shelly.GetDeviceInfo(httpChannel);
      const deviceInfo = deviceInfoResponse.result;

      const virtualDevice = this.virtualDevices.get(deviceInfo.id);

      if (virtualDevice === undefined) {
        return;
      }

      const oldAddress = virtualDevice.ipAddress;

      if (oldAddress !== newAddress) {
        this.log(`Rediscovered ${virtualDevice.deviceId} from ${oldAddress} at ${newAddress}`);
        await virtualDevice.reconnect({
          ipAddress: newAddress,
          useHttps: httpChannel.useHttps,
        });
      }
    } catch (e) {
      this.error('Error during rediscovery:', e);
    }
  }

  public async removeVirtualDevice(device: VirtualDevice): Promise<void> {
    this.virtualDevices.delete(device.deviceId);
    const virtualDeviceIds: readonly string[] = [...this.virtualDevices.keys()];
    this.homey.settings.set(VIRTUAL_DEVICE_IDS_SETTING_KEY, virtualDeviceIds);
    const deviceSettingKey = VIRTUAL_DEVICE_SETTING_KEY_PREFIX + device.deviceId;
    this.homey.settings.unset(deviceSettingKey);
  }

  public async updateVirtualDevice(device: VirtualDevice): Promise<void> {
    if (!this.virtualDevices.has(device.deviceId)) {
      this.virtualDevices.set(device.deviceId, device);
      const virtualDeviceIds: readonly string[] = [...this.virtualDevices.keys()];
      this.homey.settings.set(VIRTUAL_DEVICE_IDS_SETTING_KEY, virtualDeviceIds);
    }
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
    NumberComponent.registerFlowCards(this);
    Boolean.registerFlowCards(this);
    Button.registerFlowCards(this);

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
