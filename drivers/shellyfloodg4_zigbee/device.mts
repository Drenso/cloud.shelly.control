import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import initIasZoneDevice from '@drenso/homey-zigbee-library/lib/iasZoneDevice.mjs';
import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.mjs';

export default class ShellyFloodGen4ZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode).catch((e: unknown) =>
      this.error('Power configuration init failed', e),
    );

    await initIasZoneDevice(this, zclNode, ['alarm_water'], ['alarm1'], undefined, this.isFirstInit()).catch(
      (e: unknown) => this.error('IAS Zone init failed', e),
    );
  }
}
