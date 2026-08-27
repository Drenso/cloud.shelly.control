import { Cluster, type types, ZCLDataTypes } from 'zigbee-clusters';
import { SHELLY_ZIGBEE_MFG_CODE } from '../../config.js';

const Attributes = {
  rainStatus: {
    // Rain status
    id: 0x0000,
    type: ZCLDataTypes.bool,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
  precipitation: {
    // Precipitation (0-100000 mm, scale by 10)
    id: 0x0001,
    type: ZCLDataTypes.uint24,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
} satisfies types.AttributeDefinitions;

export type ShellyCustomRainClusterAttributes = typeof Attributes;

class ShellyCustomRainCluster extends Cluster<ShellyCustomRainClusterAttributes> {
  public static get ID(): number {
    return 0xfc03;
  }

  public static get NAME(): string {
    return 'ShellyCustomRainCluster';
  }

  public static get ATTRIBUTES(): ShellyCustomRainClusterAttributes {
    return Attributes;
  }
}

Cluster.addCluster(ShellyCustomRainCluster);

export default ShellyCustomRainCluster;
