import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import { initReadOnlyCapability } from '@drenso/homey-zigbee-library/lib/attributeDevice.mjs';
import {
  OccupancySensingCluster,
  type OccupancySensingClusterAttributes,
  type types,
  type ZCLNode,
} from 'zigbee-clusters';
import { safeAddCapability, safeRemoveCapability } from '../../lib/safeFunctions.js';
import ShellyCustomOccupancyConfigCluster, {
  type ShellyCustomOccupancyConfigClusterAttributes,
} from '../../lib/zigbee/cluster/ShellyCustomOccupancyConfigCluster.js';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

type BluDistanceSettings = {
  occupancy_enabled: boolean;
  occupied_threshold: number;
  occupancy_hysteresis: number;
};

export default class ShellyBluDistanceZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);
    await initReadOnlyCapability(
      this,
      zclNode,
      'measure_distance',
      ShellyCustomOccupancyConfigCluster,
      'distance',
      data => {
        if (data === 0) {
          return null;
        }

        return data / 1000;
      },
    );

    await initReadOnlyCapability(
      this,
      zclNode,
      'alarm_occupancy',
      OccupancySensingCluster,
      'occupancy',
      (data: types.AttributesFromDefinition<OccupancySensingClusterAttributes>['occupancy']) =>
        data.getBits().includes('occupied'),
    );
  }

  public async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: SettingsEvent<BluDistanceSettings>): Promise<string | void> {
    const newAttributes: Partial<types.AttributesFromDefinition<ShellyCustomOccupancyConfigClusterAttributes>> = {};
    if (changedKeys.includes('occupancy_enabled')) {
      if (newSettings.occupancy_enabled) {
        await safeAddCapability(this, 'alarm_occupancy');
      } else {
        await safeRemoveCapability(this, 'alarm_occupancy');
      }
    }

    if (changedKeys.includes('occupied_threshold')) {
      newAttributes.occupiedThreshold = newSettings.occupied_threshold;
    }

    if (changedKeys.includes('occupancy_hysteresis')) {
      newAttributes.hysteresis = newSettings.occupancy_hysteresis;
    }

    if (Object.keys(newAttributes).length > 0) {
      await this.zclNode.endpoints[1].clusters[ShellyCustomOccupancyConfigCluster.NAME]?.writeAttributes(newAttributes);
    }

    await super.onSettings({ oldSettings, newSettings, changedKeys });
  }
}
