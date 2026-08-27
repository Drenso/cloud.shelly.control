import { Cluster, type types, ZCLDataTypes } from 'zigbee-clusters';
import { SHELLY_ZIGBEE_MFG_CODE } from '../../config.js';
import type { ShellyIlluminanceType } from '../../flow/illuminanceFlows.js';

const Attributes = {
  lightLevel: {
    id: 0x0000,
    type: ZCLDataTypes.uint8, // 0: dark, 1: twilight, 2: bright
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
  darkThreshold: {
    id: 0x0001,
    type: ZCLDataTypes.uint24,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
  brightThreshold: {
    id: 0x0002,
    type: ZCLDataTypes.uint24,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
  },
} satisfies types.AttributeDefinitions;

export type ShellyCustomLightLevelClusterAttributes = typeof Attributes;

class ShellyCustomLightLevelCluster extends Cluster<ShellyCustomLightLevelClusterAttributes> {
  public static get ID(): number {
    return 0xfc21;
  }

  public static get NAME(): string {
    return 'ShellyCustomLightLevelCluster';
  }

  public static get ATTRIBUTES(): ShellyCustomLightLevelClusterAttributes {
    return Attributes;
  }
}

Cluster.addCluster(ShellyCustomLightLevelCluster);

export default ShellyCustomLightLevelCluster;

export function convertLightLevel(value: 0 | 1 | 2): ShellyIlluminanceType {
  switch (value) {
    case 0:
      return 'dark';
    case 1:
      return 'twilight';
    case 2:
      return 'bright';
  }
}
