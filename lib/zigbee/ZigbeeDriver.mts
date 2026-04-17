import Homey from 'homey';
import { ZigBeeDriver } from 'homey-zigbeedriver';
import zbClusters from 'zigbee-clusters';

if (Homey.env.ZB_DEBUG === '1') {
  zbClusters.debug();
}

export default abstract class ShellyZigbeeDriver extends ZigBeeDriver {}
