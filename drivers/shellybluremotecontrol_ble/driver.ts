import Homey from 'homey';
import type ShellyApp from '../../app.js';
import type { ShellyBluListDeviceProperties } from '../../lib/types.js';

export default class ShellyBluRemoteControlDriver extends Homey.Driver {
  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  public async onInit(): Promise<void> {
    await super.onInit();
    this.log('BLE driver initialized');
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
    const bleAdvertisements = await this.homey.ble.discover(['0000fcd200001000800000805f9b34fb']);
    console.debug('Advertisements:', bleAdvertisements);

    const results: ShellyBluListDeviceProperties[] = [];

    for (const bleAdvertisement of bleAdvertisements) {
      if (bleAdvertisement.localName.startsWith('SBRC')) {
        results.push({
          name: bleAdvertisement.localName,
          data: {
            id: bleAdvertisement.address,
          },
        });
      }
    }

    return results;
  }

  public debug(...args: unknown[]): void {
    this.log(...args);
  }
}
