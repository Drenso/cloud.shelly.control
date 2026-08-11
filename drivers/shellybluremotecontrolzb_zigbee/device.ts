import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import type { BoundClusterMeta } from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/BoundClusterMeta.mjs';
import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';
import ShellyBasicCluster from '../../lib/zigbee/cluster/ShellyBasicCluster.js';
import ShellyOnOffCluster from '../../lib/zigbee/cluster/ShellyOnOffCluster.js';
import ShellyOnOffBoundCluster, {
  type OffWithButtonPayload,
  type OnWithButtonPayload,
} from '../../lib/zigbee/cluster/ShellyOnOffBoundCluster.js';
import ShellyLevelControlCluster from '../../lib/zigbee/cluster/ShellyLevelControlCluster.js';
import ShellyLevelControlBoundCluster, {
  type MoveToLevelWithOnOffAndButtonPayload,
  type StepWithOnOffAndButtonPayload,
} from '../../lib/zigbee/cluster/ShellyLevelControlBoundCluster.js';

export default class ShellyBluRCZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);

    // TODO figure out why isFirstInit does not work
    // if (this.isFirstInit()) {
    // TODO get version to show firmware upgrade notice
    // Write command mode 1 to allow custom control instead of touchlink
    // TODO handle error setting this mode
    await (
      zclNode.endpoints[this.getClusterEndpoint(ShellyBasicCluster) ?? 1].clusters[
        ShellyBasicCluster.NAME
      ] as ShellyBasicCluster
    )
      .writeAttributes({
        shellyCommandMode: 1,
        shellyGroupAddress1: 0,
        shellyGroupAddress2: 0,
        shellyGroupAddress3: 0,
        shellyGroupAddress4: 0,
      })
      .catch(this.error);
    // }

    this.log(
      'Command attributes',
      await (
        zclNode.endpoints[this.getClusterEndpoint(ShellyBasicCluster) ?? 1].clusters[
          ShellyBasicCluster.NAME
        ] as ShellyBasicCluster
      )
        .readAttributes([
          'shellyCommandMode',
          'shellyGroupAddress1',
          'shellyGroupAddress2',
          'shellyGroupAddress3',
          'shellyGroupAddress4',
        ])
        .catch(this.error),
    );

    zclNode.endpoints[this.getClusterEndpoint(ShellyOnOffCluster) ?? 1].bind(
      ShellyOnOffCluster.NAME,
      new ShellyOnOffBoundCluster({
        onSetOffWithButton: this._onSetOffCommandHandler.bind(this),
        onSetOnWithButton: this._onSetOnCommandHandler.bind(this),
      }),
    );

    zclNode.endpoints[this.getClusterEndpoint(ShellyLevelControlCluster) ?? 1].bind(
      ShellyLevelControlCluster.NAME,
      new ShellyLevelControlBoundCluster({
        onMoveToLevelWithButton: this._onMoveToLevelWithOnOffHandler.bind(this),
        onStepWithOnOffAndButton: this._onStepWithOnOffHandler.bind(this),
      }),
    );
  }

  private _onSetOffCommandHandler(payload: OffWithButtonPayload, meta: BoundClusterMeta): void {
    this._onOffCommandHandler('off', payload, meta);
  }

  private _onSetOnCommandHandler(payload: OnWithButtonPayload, meta: BoundClusterMeta): void {
    this._onOffCommandHandler('on', payload, meta);
  }

  private _onOffCommandHandler(
    type: string,
    payload: OnWithButtonPayload | OffWithButtonPayload,
    meta: BoundClusterMeta,
  ): void {
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
      group: payload.buttonIndex,
    });
  }

  private _onMoveToLevelWithOnOffHandler(payload: MoveToLevelWithOnOffAndButtonPayload, meta: BoundClusterMeta): void {
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
      group: payload.buttonIndex,
    });
  }

  private _onStepWithOnOffHandler(payload: StepWithOnOffAndButtonPayload, meta: BoundClusterMeta): void {
    this.triggerFlowWithState(payload.stepMode === 0 ? 'remote_step_up' : 'remote_step_down', {
      long_press: false,
      group: payload.buttonIndex,
      step_size: payload.stepSize,
    });
  }

  private triggerFlowWithState(flowId: string, data: Record<string, unknown>): void {
    this.log('triggering flow', flowId, 'with tokens', data);
    // this.triggerFlow({ id: flowId, tokens: data }).catch(err => this.error('error triggering flow', err));
  }
}
