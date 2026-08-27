import { Cluster, type types, ZCLDataTypes } from 'zigbee-clusters';
import { SHELLY_ZIGBEE_MFG_CODE } from '../../config.js';

const Attributes = {
  uvIndex: {
    // UV index (0-11, scale by 10)
    id: 0x0000,
    type: ZCLDataTypes.uint8,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
} satisfies types.AttributeDefinitions;

export type ShellyCustomUVClusterAttributes = typeof Attributes;

class ShellyCustomUVCluster extends Cluster<ShellyCustomUVClusterAttributes> {
  public static get ID(): number {
    return 0xfc02;
  }

  public static get NAME(): string {
    return 'ShellyCustomUVCluster';
  }

  public static get ATTRIBUTES(): ShellyCustomUVClusterAttributes {
    return Attributes;
  }
}

Cluster.addCluster(ShellyCustomUVCluster);

export default ShellyCustomUVCluster;
