import { Cluster, ZCLDataTypes } from 'zigbee-clusters';

const Attributes = {
  manualMode: {
    // Manual mode (0 = auto, 1 = manual)
    id: 0x0000,
    type: ZCLDataTypes.uint8,
    manufacturerId: 0x1490,
  },
  valvePosition: {
    // Valve position (0-100%)
    id: 0x0001,
    type: ZCLDataTypes.uint8,
    manufacturerId: 0x1490,
  },
} as const;

const CommandsReceived = {
  calibrate: {
    id: 0x00,
    direction: Cluster.DIRECTION_CLIENT_TO_SERVER,
    manufacturerId: 0x1490,
  },
} as const;

export type ShellyCustomTRVClusterAttributes = typeof Attributes;
export type ShellyCustomTRVClusterCommands = typeof CommandsReceived;

class ShellyCustomTRVCluster extends Cluster<ShellyCustomTRVClusterAttributes, ShellyCustomTRVClusterCommands> {
  public static get ID(): number {
    return 0xfc24;
  }

  public static get NAME(): string {
    return 'ShellyCustomTRVCluster';
  }

  public static get ATTRIBUTES(): ShellyCustomTRVClusterAttributes {
    return Attributes;
  }

  public static get COMMANDS(): ShellyCustomTRVClusterCommands {
    return {
      ...CommandsReceived,
    };
  }
}

Cluster.addCluster(ShellyCustomTRVCluster);

export default ShellyCustomTRVCluster;
