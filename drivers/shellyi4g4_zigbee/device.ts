import zbClusters, { type OnOffSwitchCluster, type ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

export default class ShellyI4Gen4ZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    const cluster = zclNode.endpoints[1].clusters[zbClusters.CLUSTER.ON_OFF_SWITCH.NAME] as OnOffSwitchCluster;

    // todo: This device has 2 switch types, toggle and momentary
    // the actions are different. In momentary mode we should only use the scenes cluster
    // while in toggle mode we should only use the onOff cluster.
    // It also seems to use the level control cluster in both modes, but I do not think we need to use those actualy

    this.homey.setTimeout(async () => {
      await cluster.writeAttributes({ switchType: 'momentary' }).catch(this.error);

      while (true) {
        await cluster
          .readAttributes(['switchType', 'switchActions'])
          .then(data => this.log('Current values', data))
          .catch(this.error);
        await new Promise(resolve => this.homey.setTimeout(resolve, 5000));

        await cluster.writeAttributes({ switchActions: 'onOff' }).catch(this.error);
        await cluster
          .readAttributes(['switchType', 'switchActions'])
          .then(data => this.log('onOff', data))
          .catch(this.error);
        await new Promise(resolve => this.homey.setTimeout(resolve, 20000));

        await cluster.writeAttributes({ switchActions: 'offOn' }).catch(this.error);
        await cluster
          .readAttributes(['switchType', 'switchActions'])
          .then(data => this.log('offOn', data))
          .catch(this.error);
        await new Promise(resolve => this.homey.setTimeout(resolve, 20000));

        await cluster.writeAttributes({ switchActions: 'toggle' }).catch(this.error);
        await cluster
          .readAttributes(['switchType', 'switchActions'])
          .then(data => this.log('toggle', data))
          .catch(this.error);
        await new Promise(resolve => this.homey.setTimeout(resolve, 20000));
      }
    }, 5000);
  }
}
