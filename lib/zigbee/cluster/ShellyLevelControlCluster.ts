import {
  Cluster,
  LevelControlCluster,
  type LevelControlClusterAttributes,
  type LevelControlClusterCommands,
  type types,
  ZCLDataTypes,
} from 'zigbee-clusters';
import { SHELLY_ZIGBEE_MFG_CODE } from '../../config.js';

const additionalCommands = {
  shellyMoveToLevelWithButton: {
    id: 0x80,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    args: {
      level: ZCLDataTypes.uint8,
      transitionTime: ZCLDataTypes.uint16,
      buttonIndex: ZCLDataTypes.uint8,
    },
  },
  shellyMoveToLevelWithOnOffAndButton: {
    id: 0x84,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    args: {
      level: ZCLDataTypes.uint8,
      transitionTime: ZCLDataTypes.uint16,
      buttonIndex: ZCLDataTypes.uint8,
    },
  },
  shellyStepWithOnOffAndButton: {
    id: 0x86,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    args: {
      stepMode: ZCLDataTypes.uint8,
      stepSize: ZCLDataTypes.uint8,
      transitionTime: ZCLDataTypes.uint16,
      buttonIndex: ZCLDataTypes.uint8,
    },
  },
} satisfies types.CommandDefinitions;

export type ShellyLevelControlClusterCommands = typeof additionalCommands & LevelControlClusterCommands;

export default class ShellyLevelControlCluster extends LevelControlCluster<
  LevelControlClusterAttributes,
  ShellyLevelControlClusterCommands
> {
  public static get COMMANDS(): ShellyLevelControlClusterCommands {
    return {
      ...super.COMMANDS,
      ...additionalCommands,
    };
  }
}

Cluster.addCluster(ShellyLevelControlCluster);
