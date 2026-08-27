import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import { initReadOnlyCapability } from '@drenso/homey-zigbee-library/lib/attributeDevice.mjs';
import initIasZoneDevice from '@drenso/homey-zigbee-library/lib/iasZoneDevice.mjs';
import type { types, ZCLNode } from 'zigbee-clusters';
import ShellyCustomLightLevelCluster, {
  convertLightLevel,
  type ShellyCustomLightLevelClusterAttributes,
} from '../../lib/zigbee/cluster/ShellyCustomLightLevelCluster.js';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

type BluDoorWindowZBSettings = {
  'Illuminance:bright_thr': number;
  'Illuminance:dark_thr': number;
};

export default class ShellyBluDoorWindowZBZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);
    await initIasZoneDevice(
      this,
      zclNode,
      ['alarm_open', 'alarm_shelly_tilt'],
      ['alarm1', (payload): boolean => payload.zoneStatus.alarm1 && !payload.zoneStatus.alarm2],
      undefined,
      this.isFirstInit(),
    ).catch((e: unknown) => this.error('IAS Zone init failed', e));

    await initReadOnlyCapability(
      this,
      zclNode,
      'shelly_illumination',
      ShellyCustomLightLevelCluster,
      'lightLevel',
      convertLightLevel,
    );
  }

  public async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: SettingsEvent<BluDoorWindowZBSettings>): Promise<string | void> {
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
