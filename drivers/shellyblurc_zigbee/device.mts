import zbClusters, { type ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.mjs';
import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import OnOffBoundCluster from '../../lib/zigbee/cluster/OnOffBoundCluster.mjs';
import LevelControlBoundCluster from '../../lib/zigbee/cluster/LevelControlBoundCluster.mjs';

export default class ShellyBluRCZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);

    zclNode.endpoints[1].bind(
      zbClusters.CLUSTER.ON_OFF.NAME,
      new OnOffBoundCluster(
        meta => this._onOffCommandHandler('off', meta),
        meta => this._onOffCommandHandler('on', meta),
      ),
    );

    zclNode.endpoints[1].bind(
      zbClusters.CLUSTER.LEVEL_CONTROL.NAME,
      new LevelControlBoundCluster(
        (payload, meta) => this._onMoveToLevelWithOnOffHandler(payload, meta),
        (payload, meta) => this._onStepWithOnOffHandler(payload, meta),
      ),
    );
  }

  private _onOffCommandHandler(type: string, meta: OnOffMeta): void {
    let flowId: string;
    switch (type) {
      case 'on':
        flowId = 'remote_on';
        break;
      case 'off':
        flowId = 'remote_off';
        break;
      default:
        this.error(`Invalid on/off type ${type}`);
        return;
    }

    this.triggerFlowWithState(flowId, {
      group: meta.groupId,
    });
  }

  private _onMoveToLevelWithOnOffHandler(payload: LevelMovePayload, meta: LevelMeta): void {
    let flowId: string;
    switch (payload.level) {
      case 254:
        flowId = 'remote_step_up';
        break;
      case 1:
        flowId = 'remote_step_down';
        break;
      default:
        this.error(`Invalid payload level ${payload.level}`);
        return;
    }

    this.triggerFlowWithState(flowId, {
      long_press: true,
      group: meta.groupId,
    });
  }

  private _onStepWithOnOffHandler(payload: LevelPayload, meta: LevelMeta): void {
    this.triggerFlowWithState(payload.mode === 'up' ? 'remote_step_up' : 'remote_step_down', {
      long_press: false,
      group: meta.groupId,
      step_size: payload.stepSize,
    });
  }

  private triggerFlowWithState(flowId: string, data: Record<string, unknown>): void {
    this.log('triggering flow', flowId, 'with tokens', data);
    // this.triggerFlow({ id: flowId, tokens: data }).catch(err => this.error('error triggering flow', err));
  }
}

export interface LevelMovePayload {
  level: number;
  transitionTime: number;
}

export interface LevelPayload {
  mode: string;
  stepSize: number;
  transitionTime: number;
}

export interface OnOffMeta {
  transId: number;
  linkQuality: number;
  dstEndpoint: number;
  timestamp: number;
  groupId: number;
}

export interface LevelMeta {
  transId: number;
  linkQuality: number;
  dstEndpoint: number;
  timestamp: number;
  groupId: number;
}
