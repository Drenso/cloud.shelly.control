import {
  Cluster,
  OnOffCluster,
  type OnOffClusterAttributes,
  type OnOffClusterCommands,
  type types,
  ZCLDataTypes,
} from 'zigbee-clusters';
import { SHELLY_ZIGBEE_MFG_CODE } from '../../config.js';

const additionalCommands = {
  shellySetOffWithButton: {
    id: 0x80,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    args: {
      buttonIndex: ZCLDataTypes.uint8,
    },
  },
  shellySetOnWithButton: {
    id: 0x81,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    args: {
      buttonIndex: ZCLDataTypes.uint8,
    },
  },
  shellyToggleWithButton: {
    id: 0x82,
    manufacturerId: SHELLY_ZIGBEE_MFG_CODE,
    args: {
      buttonIndex: ZCLDataTypes.uint8,
    },
  },
} satisfies types.CommandDefinitions;

export type ShellyOnOffClusterCommands = typeof additionalCommands & OnOffClusterCommands;

export default class ShellyOnOffCluster extends OnOffCluster<OnOffClusterAttributes, ShellyOnOffClusterCommands> {
  public static get COMMANDS(): ShellyOnOffClusterCommands {
    return {
      ...super.COMMANDS,
      ...additionalCommands,
    };
  }
}

Cluster.addCluster(ShellyOnOffCluster);
