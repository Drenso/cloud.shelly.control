import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import type { BoundClusterMeta } from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/BoundClusterMeta.mjs';
import type {
  MoveToLevelWithOnOffPayload,
  StepWithOnOffPayload,
} from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/LevelControlBoundCluster.mjs';
import LevelControlBoundCluster from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/LevelControlBoundCluster.mjs';
import OnOffBoundCluster from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/OnOffBoundCluster.mjs';
import zbClusters, { type ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

export default class ShellyBluRCZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);

    zclNode.endpoints[1].bind(
      zbClusters.CLUSTER.ON_OFF.NAME,
      new OnOffBoundCluster({
        onSetOff: this._onSetOffCommandHandler.bind(this),
        onSetOn: this._onSetOnCommandHandler.bind(this),
      }),
    );

    zclNode.endpoints[1].bind(
      zbClusters.CLUSTER.LEVEL_CONTROL.NAME,
      new LevelControlBoundCluster({
        onMoveToLevel: this._onMoveToLevelWithOnOffHandler.bind(this),
        onStep: this._onStepWithOnOffHandler.bind(this),
      }),
    );
  }

  private _onSetOffCommandHandler(meta: BoundClusterMeta): void {
    this._onOffCommandHandler('off', meta);
  }

  private _onSetOnCommandHandler(meta: BoundClusterMeta): void {
    this._onOffCommandHandler('on', meta);
  }

  private _onOffCommandHandler(type: string, meta: BoundClusterMeta): void {
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

  private _onMoveToLevelWithOnOffHandler(payload: MoveToLevelWithOnOffPayload, meta: BoundClusterMeta): void {
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

  private _onStepWithOnOffHandler(payload: StepWithOnOffPayload, meta: BoundClusterMeta): void {
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
