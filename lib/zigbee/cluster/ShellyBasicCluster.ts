import { BasicCluster, type BasicClusterAttributes, Cluster, type types, ZCLDataTypes } from 'zigbee-clusters';
import { SHELLY_ZIGBEE_MFG_CODE } from '../../config.js';

const additionalAttributes = {
  shellyGroupAddress1: {
    id: 0x8000,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    type: ZCLDataTypes.uint16,
  },
  shellyGroupAddress2: {
    id: 0x8001,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    type: ZCLDataTypes.uint16,
  },
  shellyGroupAddress3: {
    id: 0x8002,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    type: ZCLDataTypes.uint16,
  },
  shellyGroupAddress4: {
    id: 0x8003,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    type: ZCLDataTypes.uint16,
  },
  shellyCommandMode: {
    id: 0x8004,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    type: ZCLDataTypes.uint8,
  },
} satisfies types.AttributeDefinitions;

export type ShellyBasicClusterAttributes = typeof additionalAttributes & BasicClusterAttributes;

export default class ShellyBasicCluster extends BasicCluster<ShellyBasicClusterAttributes> {
  public static get ATTRIBUTES(): ShellyBasicClusterAttributes {
    return {
      ...super.ATTRIBUTES,
      ...additionalAttributes,
    };
  }
}

Cluster.addCluster(ShellyBasicCluster);
