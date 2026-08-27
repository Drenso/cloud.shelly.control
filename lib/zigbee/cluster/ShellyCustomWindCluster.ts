import { Cluster, type types, ZCLDataTypes } from 'zigbee-clusters';
import { SHELLY_ZIGBEE_MFG_CODE } from '../../config.js';

const Attributes = {
  windSpeed: {
    // Wind speed in m/s (0-140, scale by 10)
    id: 0x0000,
    type: ZCLDataTypes.uint16,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
  windDirection: {
    // Wind direction in degrees (0-360, scale by 10)
    id: 0x0004,
    type: ZCLDataTypes.uint16,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
  gustSpeed: {
    // Gust speed in m/s (0-140, scale by 10)
    id: 0x0007,
    type: ZCLDataTypes.uint16,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
} satisfies types.AttributeDefinitions;

export type ShellyCustomWindClusterAttributes = typeof Attributes;

class ShellyCustomWindCluster extends Cluster<ShellyCustomWindClusterAttributes> {
  public static get ID(): number {
    return 0xfc01;
  }

  public static get NAME(): string {
    return 'ShellyCustomWindCluster';
  }

  public static get ATTRIBUTES(): ShellyCustomWindClusterAttributes {
    return Attributes;
  }
}

Cluster.addCluster(ShellyCustomWindCluster);

export default ShellyCustomWindCluster;
