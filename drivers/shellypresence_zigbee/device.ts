import {
  addCapabilityIfNotExists,
  removeCapabilityIfExists,
} from '@drenso/homey-zigbee-library/lib/helper/capability.mjs';
import type { Bitmap } from 'zigbee-clusters';
import zbClusters from 'zigbee-clusters';
import type { MultiZoneCapabilityDeviceInterface } from '../../lib/capabilityInterfaces.js';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

type DeviceSettings = {
  'alarm_presence.zone_1.enabled': boolean;
  'alarm_presence.zone_2.enabled': boolean;
  'alarm_presence.zone_3.enabled': boolean;
  'alarm_presence.zone_4.enabled': boolean;
  'alarm_presence.zone_5.enabled': boolean;
  'alarm_presence.zone_6.enabled': boolean;
  'alarm_presence.zone_7.enabled': boolean;
  'alarm_presence.zone_8.enabled': boolean;
  'alarm_presence.zone_9.enabled': boolean;
  'alarm_presence.zone_10.enabled': boolean;
};

export default class ShellyPresenceGen4ZigbeeDevice
  extends ShellyZigbeeDevice
  implements MultiZoneCapabilityDeviceInterface
{
  private static readonly zones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  public initialisedCapabilities: string[] = [];

  protected async configureDevice(): Promise<void> {
    for (const zone of ShellyPresenceGen4ZigbeeDevice.zones) {
      this.registerZoneCapability(zone);
    }
  }

  public async onSettings({
    newSettings,
    changedKeys,
  }: {
    oldSettings: DeviceSettings;
    newSettings: DeviceSettings;
    changedKeys: Array<keyof DeviceSettings>;
  }): Promise<string | void> {
    for (const changedKey of changedKeys) {
      const zoneEnabled = newSettings[changedKey];
      const capabilityId = changedKey.replace('.enabled', '');
      const zone = Number(capabilityId.replace('alarm_presence.zone_', ''));
      if (zoneEnabled) {
        await addCapabilityIfNotExists(this, capabilityId);
        this.registerZoneCapability(zone);
      } else {
        await removeCapabilityIfExists(this, capabilityId);
      }
    }
  }

  public isZoneOccupied(zone: number): boolean {
    const zoneCapabilityId = this.getZoneCapabilityId(zone);
    return this.hasCapability(zoneCapabilityId) ? false : (this.getCapabilityValue(zoneCapabilityId) ?? false);
  }

  private registerZoneCapability(zone: number): void {
    const zoneCapabilityId = this.getZoneCapabilityId(zone);

    if (!this.hasCapability(zoneCapabilityId)) {
      return;
    }

    if (this.initialisedCapabilities.includes(zoneCapabilityId)) {
      return;
    }

    this.registerCapability(zoneCapabilityId, zbClusters.OccupancySensingCluster, {
      get: 'occupancy',
      report: 'occupancy',
      endpoint: zone,
      getOpts: {
        getOnStart: false,
        getOnOnline: true,
      },
      reportParser: (value: Bitmap<'occupied'>) => {
        const occupied = value.getBit(0);

        const flow = `alarm_presence_zone_x_${occupied ? 'true' : 'false'}`;
        this.homey.flow.getDeviceTriggerCard(flow).trigger(this, { zone }, { zone }).catch(this.error);

        return occupied;
      },
    });

    this.initialisedCapabilities.push(zoneCapabilityId);
  }

  private getZoneCapabilityId(zone: number): string {
    return `alarm_presence.zone_${zone}`;
  }
}
