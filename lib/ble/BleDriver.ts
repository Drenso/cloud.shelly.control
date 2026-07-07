import Homey from 'homey';
import type ShellyApp from '../../app.js';
import type { ShellyBluListDeviceProperties } from '../types.js';

const BTHOME_SERVICE_UUID = '0000fcd200001000800000805f9b34fb';

export default abstract class ShellyBleDriver extends Homey.Driver {
  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  public getDefaultName(): string {
    return this.manifest.name.en.split('-')[0].trim();
  }

  protected get baseDriverId(): string {
    return this.id.split('_')[0];
  }

  public async onPair(session: Homey.Driver.PairSession): Promise<void> {
    session.setHandler('list_devices', this.onPairListDevices.bind(this));
    session.setHandler('hide-ble-information', async value => {
      this.debug('Hide BLE information:', value);
      this.homey.settings.set('hide-ble-information', value);
    });
    session.setHandler('showView', async (view: string) => {
      if (view === 'ble_information') {
        const hideBleInformation = this.homey.settings.get('hide-ble-information');
        this.debug('Hide BLE information:', hideBleInformation);
        if (hideBleInformation) {
          await session.nextView();
        }
      }
    });
    session.setHandler('pair_instructions', async () => {
      return this.manifest['learnmode'];
    });
  }

  public async onPairListDevices(): Promise<ShellyBluListDeviceProperties[]> {
    // Pre-filter on BTHome service
    const bleAdvertisements = await this.homey.ble.discover([BTHOME_SERVICE_UUID]);
    console.debug('Advertisements:', bleAdvertisements);

    const results: ShellyBluListDeviceProperties[] = [];

    for (const bleAdvertisement of bleAdvertisements) {
      if (bleAdvertisement.localName.startsWith(this.bleNamePrefix)) {
        results.push({
          name: this.getDefaultName(),
          icon: `../../../assets/drivers/${this.baseDriverId}/icon.svg`,
          data: {
            id: bleAdvertisement.address,
            uuid: bleAdvertisement.uuid,
          },
        });
      }
    }

    return results;
  }

  public abstract bleNamePrefix: string;

  public debug(...args: unknown[]): void {
    if (Homey.env['DEBUG'] !== '1') {
      return;
    }

    console.log(new Date(), '[dbg]', '[ManagerDrivers]', `[Driver:${this.id}]`, ...args);
  }
}
