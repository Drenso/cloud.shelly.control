import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import type {ZCLNode} from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/ZigbeeDevice.mjs';

export default class Shelly1MiniGen4ZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initOnOffDevice(this, zclNode);
  }
}
