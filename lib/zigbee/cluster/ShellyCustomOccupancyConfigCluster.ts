import { Cluster, type types, ZCLDataTypes } from 'zigbee-clusters';
import { SHELLY_ZIGBEE_MFG_CODE } from '../../config.js';

const Attributes = {
  distance: {
    // in mm
    id: 0x0000,
    type: ZCLDataTypes.uint16,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
  occupiedThreshold: {
    id: 0x0001,
    type: ZCLDataTypes.uint16,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
  hysteresis: {
    id: 0x0002,
    type: ZCLDataTypes.uint16,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
} satisfies types.AttributeDefinitions;

export type ShellyCustomOccupancyConfigClusterAttributes = typeof Attributes;

class ShellyCustomOccupancyConfigCluster extends Cluster<ShellyCustomOccupancyConfigClusterAttributes> {
  public static get ID(): number {
    return 0xfc22;
  }

  public static get NAME(): string {
    return 'ShellyCustomOccupancyConfigCluster';
  }

  public static get ATTRIBUTES(): ShellyCustomOccupancyConfigClusterAttributes {
    return Attributes;
  }
}

Cluster.addCluster(ShellyCustomOccupancyConfigCluster);

export default ShellyCustomOccupancyConfigCluster;
