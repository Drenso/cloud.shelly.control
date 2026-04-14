import { Cluster, ZCLDataTypes } from 'zigbee-clusters';
import type { DefaultResponseCommand } from '@drenso/homey-zigbee-library/lib/clusters/ZCL.mts';

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

class ShellyCustomTRVCluster extends Cluster {
  public static get ID(): number {
    return 0xfc24;
  }

  public static get NAME(): string {
    return 'ShellyCustomTRVCluster';
  }

  public static get ATTRIBUTES(): typeof Attributes {
    return Attributes;
  }

  public static get COMMANDS(): typeof CommandsReceived {
    return {
      ...CommandsReceived,
    };
  }

  public readAttributes<T extends keyof typeof Attributes>(
    attributeNames: T[],
    opts?: { timeout: number },
  ): Promise<{
    [p in T]: (typeof Attributes)[p]['type'];
  }> {
    return super.readAttributes(attributeNames, opts) as unknown as Promise<{
      [p in T]: (typeof Attributes)[p]['type'];
    }>;
  }

  public writeAttributes<T extends keyof typeof Attributes>(attributes: {
    [p in T]: (typeof Attributes)[p]['type'];
  }): Promise<{
    [p in T]: DefaultResponseCommand;
  }> {
    return super.writeAttributes(attributes) as unknown as Promise<{
      [p in T]: DefaultResponseCommand;
    }>;
  }
}

Cluster.addCluster(ShellyCustomTRVCluster);

export default ShellyCustomTRVCluster;
