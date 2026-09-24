import type { ZigBeeNode } from 'homey';
import Homey from 'homey';
import { ZigBeeDevice } from 'homey-zigbeedriver';
import { OnOffCluster, OnOffSwitchCluster, type ZCLNode } from 'zigbee-clusters';
import { type QueuedWorker, queueWorker } from '../global-promise-queue.js';
import Logger from '../log/Logger.js';
import { type ButtonEventType, safeTriggerButtonPressed, safeTriggerSingleButtonPressed } from '../flow/buttonFlows.js';
import { safeTriggerInputSwitchChanged, safeTriggerSingleInputSwitchChanged } from '../flow/switchInputFlows.js';
import ScenesBoundCluster, {
  type RecallScenePayload,
} from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/ScenesBoundCluster.mjs';
import { safeAddCapability, safeRemoveCapability } from '../safeFunctions.js';
import OnOffBoundCluster from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/OnOffBoundCluster.mjs';
import ExtendedScenesCluster from '@drenso/homey-zigbee-library/lib/clusters/ExtendedScenesCluster.mjs';
import type { ButtonIndicesDeviceInterface, SwitchIndicesDeviceInterface } from '../capabilityInterfaces.js';

export default abstract class ShellyZigbeeDevice
  extends ZigBeeDevice
  implements ButtonIndicesDeviceInterface, SwitchIndicesDeviceInterface
{
  protected logger?: Logger = undefined;
  private queuedWorker?: QueuedWorker;
  protected initializationErrorKey = 'device.initialization_error';
  protected initializationErrorTags = {};

  protected buttonIndices: number[] = [];
  protected switchIndices: number[] = [];

  public getButtonIndices(): number[] {
    return this.buttonIndices;
  }

  public getSwitchIndices(): number[] {
    return this.switchIndices;
  }

  public async onNodeInit(payload: { zclNode: ZCLNode; node: ZigBeeNode }): Promise<void> {
    this.logger = new Logger(
      this,
      super.log,
      super.error,
      this.isSubDevice() ? `sub:${this.getData().subDeviceId}` : 'main',
    );

    if (Homey.env.ZB_DEBUG === '1') {
      this.enableDebug();
    }

    await super.onNodeInit(payload);

    // Mark as unavailable during startup
    await this.setUnavailable(this.homey.__('device.initializing'));

    this.queuedWorker = queueWorker('zigbee', async () => {
      try {
        this.debug('Running queued worker');
        await this.doConfiguration(payload.zclNode);
      } catch (e) {
        this.error('Failed initialisation', e);
        this.setUnavailable(this.homey.__(this.initializationErrorKey, this.initializationErrorTags)).catch(this.error);
      }
    });
    this.queuedWorker.promise.then(() => delete this.queuedWorker);
  }

  public async onUninit(): Promise<void> {
    if (this.queuedWorker) {
      this.queuedWorker.context.cancel = true;
    }
  }

  private async doConfiguration(zclNode: ZCLNode): Promise<void> {
    this.debug('Starting configuration...');

    if (this.getStoreValue('initialized') !== true) {
      await this.firstInitConfigureDevice(zclNode);
      await this.setStoreValue('initialized', true).catch(this.error);
    }

    // Let the device configure itself
    try {
      await this.configureDevice(zclNode);

      // Mark as available
      await this.setAvailable().catch(err => this.error('Error while setting available at end of configuration:', err));

      this.log('Configuration completed!');
    } catch (err) {
      this.error('Error while configuring device:', err);

      await this.setUnavailable(this.homey.__('device.initialization_error')).catch(err =>
        this.error('Error while setting unavailable due to error during configuration:', err),
      );
    }
  }

  /** Use this method to configure the device-specific capabilities */
  protected abstract configureDevice(zclNode: ZCLNode): Promise<void>;

  /** Use this method to configure anything that needs to be configured at first initialization */
  protected async firstInitConfigureDevice(_zclNode: ZCLNode): Promise<void> {
    // To override
  }

  public log(...args: unknown[]): void {
    if (this.logger) {
      this.logger.log(...args);
    } else {
      super.log(...args);
    }
  }

  public error(...args: unknown[]): void {
    if (this.logger) {
      this.logger.error(...args);
    } else {
      super.error(...args);
    }
  }

  public debug(...args: unknown[]): void {
    this.logger?.debug(...args);
  }

  protected async initializeInputFlows(zclNode: ZCLNode, endpointIds: number[]): Promise<void> {
    const buttonIndices: number[] = [];
    const switchIndices: number[] = [];

    for (let i = 0; i < endpointIds.length; i++) {
      const endpointId = endpointIds[i];

      const { switchType } = await (
        zclNode.endpoints[endpointId].clusters[OnOffSwitchCluster.NAME] as OnOffSwitchCluster
      ).readAttributes(['switchType']);
      this.debug(endpointId, 'SwitchType:', switchType);

      if (switchType === 'momentary') {
        buttonIndices.push(i);
      } else if (switchType === 'toggle') {
        switchIndices.push(i);
      } else {
        this.error(`Unexpected switchType for endpoint ${endpointId}:`, switchType);
      }
    }

    this.debug('Button indices:', buttonIndices);
    this.debug('Switch indices:', switchIndices);

    if (buttonIndices.length > 1) {
      await safeAddCapability(this, 'hidden.button_pressed');
      await safeRemoveCapability(this, 'hidden.single_button_pressed');
    } else if (buttonIndices.length === 1) {
      await safeRemoveCapability(this, 'hidden.button_pressed');
      await safeAddCapability(this, 'hidden.single_button_pressed');
    } else {
      await safeRemoveCapability(this, 'hidden.button_pressed');
      await safeRemoveCapability(this, 'hidden.single_button_pressed');
    }

    if (switchIndices.length > 1) {
      await safeAddCapability(this, 'hidden.input_switch_changed');
      await safeRemoveCapability(this, 'hidden.single_input_switch_changed');
    } else if (switchIndices.length === 1) {
      await safeRemoveCapability(this, 'hidden.input_switch_changed');
      await safeAddCapability(this, 'hidden.single_input_switch_changed');
    } else {
      await safeRemoveCapability(this, 'hidden.input_switch_changed');
      await safeRemoveCapability(this, 'hidden.single_input_switch_changed');
    }

    for (const buttonIndex of buttonIndices) {
      const endpointId = endpointIds[buttonIndex];
      zclNode.endpoints[endpointId].bind(
        ExtendedScenesCluster.NAME,
        new ScenesBoundCluster({
          onRecallScene: (payload: RecallScenePayload): Promise<void> => this.handleButtonPress(buttonIndex, payload),
        }),
      );
    }

    for (const switchIndex of switchIndices) {
      const endpointId = endpointIds[switchIndex];
      zclNode.endpoints[endpointId].bind(
        OnOffCluster.NAME,
        new OnOffBoundCluster({
          onSetOn: (): Promise<void> => this.handleSwitchToggle(switchIndex, true),
          onSetOff: (): Promise<void> => this.handleSwitchToggle(switchIndex, false),
        }),
      );
    }

    this.switchIndices = switchIndices;
    this.buttonIndices = buttonIndices;
  }

  protected async handleSwitchToggle(index: number, value: boolean): Promise<void> {
    this.debug(`Switch ${index}:`, value);
    await safeTriggerInputSwitchChanged(this, index, value);
    await safeTriggerSingleInputSwitchChanged(this, value);
  }

  protected convertButtonEvent(scene: number): ButtonEventType | null {
    switch (scene) {
      case 1:
        return 'single_press';
      case 2:
        return 'double_press';
      case 3:
        return 'triple_press';
      case 4:
        return 'hold';
      default:
        return null;
    }
  }

  protected async handleButtonPress(index: number, payload: RecallScenePayload): Promise<void> {
    if (payload.sceneId === 5) {
      // switch toggle, ignore
      return;
    }

    const buttonEvent = this.convertButtonEvent(payload.sceneId);

    this.debug(`Button ${index}:`, buttonEvent);

    if (buttonEvent === null) {
      this.error('Unsupported Zigbee button scene:', payload.sceneId);
      return;
    }

    await safeTriggerButtonPressed(this, index, buttonEvent);
    await safeTriggerSingleButtonPressed(this, buttonEvent);
  }
}
