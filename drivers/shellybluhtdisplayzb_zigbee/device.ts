import initMeasureHumidityDevice from '@drenso/homey-zigbee-library/capabilities/measureHumidity.mjs';
import initMeasureTemperatureDevice from '@drenso/homey-zigbee-library/capabilities/measureTemperature.mjs';
import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import { initReadOnlyCapability } from '@drenso/homey-zigbee-library/lib/attributeDevice.mjs';
import { TimeCluster, type types, type ZCLNode } from 'zigbee-clusters';
import ShellyCustomLightLevelCluster, {
  convertLightLevel,
  type ShellyCustomLightLevelClusterAttributes,
} from '../../lib/zigbee/cluster/ShellyCustomLightLevelCluster.js';
import ShellyTimeBoundCluster from '../../lib/zigbee/cluster/ShellyTimeBoundCluster.js';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

type BluHTDisplayZBSettings = {
  'Illuminance:bright_thr': number;
  'Illuminance:dark_thr': number;
};

export default class ShellyBluHTDisplayZBBleDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);
    await initMeasureTemperatureDevice(this, zclNode);
    await initMeasureHumidityDevice(this, zclNode);
    await initReadOnlyCapability(
      this,
      zclNode,
      'shelly_illumination',
      ShellyCustomLightLevelCluster,
      'lightLevel',
      convertLightLevel,
    );

    zclNode.endpoints[1].bind(TimeCluster.NAME, new ShellyTimeBoundCluster(this.homey.clock));
  }

  public async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: SettingsEvent<BluHTDisplayZBSettings>): Promise<string | void> {
    const newAttributes: Partial<types.AttributesFromDefinition<ShellyCustomLightLevelClusterAttributes>> = {};
    if (changedKeys.includes('Illuminance:bright_thr')) {
      newAttributes['brightThreshold'] = newSettings['Illuminance:bright_thr'];
    }

    if (changedKeys.includes('Illuminance:dark_thr')) {
      newAttributes['darkThreshold'] = newSettings['Illuminance:dark_thr'];
    }

    if (Object.keys(newAttributes).length > 0) {
      await this.zclNode.endpoints[1].clusters[ShellyCustomLightLevelCluster.NAME]?.writeAttributes(newAttributes);
    }

    await super.onSettings({ oldSettings, newSettings, changedKeys });
  }
}
