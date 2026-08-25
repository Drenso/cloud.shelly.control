import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
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
  type StepWithOnOffAndButtonPayload,
} from '../../lib/zigbee/cluster/ShellyLevelControlBoundCluster.js';
import semver from 'semver/preload.js';
import { Util } from 'homey-zigbeedriver';

export default class ShellyBluRCZigbeeDevice extends ShellyZigbeeDevice {
  private _triggerOnOff?: (flowId: string, data: Record<string, unknown>) => void;
  private _triggerStep?: (flowId: string, data: Record<string, unknown>) => void;

  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);

    this._triggerOnOff = Util.debounce(this.triggerFlowWithState.bind(this), 100);
    this._triggerStep = Util.debounce(this.triggerFlowWithState.bind(this), 100);

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
        onStepWithOnOffAndButton: this._onStepWithOnOffHandler.bind(this),
      }),
    );
  }

  protected async firstInitConfigureDevice(zclNode: ZCLNode): Promise<void> {
    const version = await (
      zclNode.endpoints[this.getClusterEndpoint(ShellyBasicCluster) ?? 1].clusters[
        ShellyBasicCluster.NAME
      ] as ShellyBasicCluster
    )
      .readAttributes(['swBuildId'])
      .catch(this.error);

    if (!version || semver.lt(version.swBuildId, '1.2.13')) {
      this.initializationErrorKey = 'device.firmware_too_old';
      this.initializationErrorTags = { version: '1.2.13' };
      throw new Error(this.homey.__('device.firmware_too_old', { version: '1.2.13' }));
    }

    // Write command mode 1 to allow custom control instead of touchlink
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
      .catch(async () => {
        this.initializationErrorKey = 'error.configuration_failed';
        throw new Error(this.homey.__('error.configuration_failed'));
      });
  }

  private _onSetOffCommandHandler(payload: OffWithButtonPayload): void {
    this._onOffCommandHandler('off', payload);
  }

  private _onSetOnCommandHandler(payload: OnWithButtonPayload): void {
    this._onOffCommandHandler('on', payload);
  }

  private _onOffCommandHandler(type: string, payload: OnWithButtonPayload | OffWithButtonPayload): void {
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

    this._triggerOnOff?.(flowId, {
      group: payload.buttonIndex,
    });
  }

  private _onStepWithOnOffHandler(payload: StepWithOnOffAndButtonPayload): void {
    this._triggerStep?.(payload.stepMode === 0 ? 'remote_step_up' : 'remote_step_down', {
      group: payload.buttonIndex,
      step_size: payload.stepSize,
    });
  }

  private triggerFlowWithState(flowId: string, data: Record<string, unknown>): void {
    this.log('triggering flow', flowId, 'with tokens', data);
    // this.triggerFlow({ id: flowId, tokens: data }).catch(err => this.error('error triggering flow', err));
  }
}
