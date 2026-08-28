import initMeasureHumidityDevice from '@drenso/homey-zigbee-library/capabilities/measureHumidity.mjs';
import initMeasureTemperatureDevice from '@drenso/homey-zigbee-library/capabilities/measureTemperature.mjs';
import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

export default class ShellyBluHTZBBleDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);
    await initMeasureTemperatureDevice(this, zclNode);
    await initMeasureHumidityDevice(this, zclNode);
  }
}
