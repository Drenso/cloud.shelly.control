import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import LevelControlBoundCluster from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/LevelControlBoundCluster.mjs';
import OnOffBoundCluster from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/OnOffBoundCluster.mjs';
import ScenesBoundCluster, {
  type RecallScenePayload,
} from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/ScenesBoundCluster.mjs';
import ExtendedScenesCluster from '@drenso/homey-zigbee-library/lib/clusters/ExtendedScenesCluster.mjs';
import { LevelControlCluster, OnOffCluster, type ZCLNode } from 'zigbee-clusters';
import type { ButtonIndicesDeviceInterface, ButtonEventTypesDeviceInterface } from '../../lib/capabilityInterfaces.js';
import { type ButtonEventType, safeTriggerButtonPressed } from '../../lib/flow/buttonFlows.js';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

export default class ShellyBluWallSwitch4ZBZigbeeDevice
  extends ShellyZigbeeDevice
  implements ButtonIndicesDeviceInterface, ButtonEventTypesDeviceInterface
{
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);

    // Endpoint 1 is for the left 2 buttons
    zclNode.endpoints[1].bind(
      OnOffCluster.NAME,
      new OnOffBoundCluster({
        onSetOn: (): Promise<void> => safeTriggerButtonPressed(this, 0, 'single_press'),
        onSetOff: (): Promise<void> => safeTriggerButtonPressed(this, 1, 'single_press'),
      }),
    );

    zclNode.endpoints[1].bind(
      LevelControlCluster.NAME,
      new LevelControlBoundCluster({
        onStep: (payload): Promise<void> => safeTriggerButtonPressed(this, payload.mode === 'up' ? 0 : 1, 'hold'),
      }),
    );

    // Endpoint 2 is for the right 2 buttons
    zclNode.endpoints[2].bind(
      OnOffCluster.NAME,
      new OnOffBoundCluster({
        onSetOn: (): Promise<void> => safeTriggerButtonPressed(this, 2, 'single_press'),
        onSetOff: (): Promise<void> => safeTriggerButtonPressed(this, 3, 'single_press'),
      }),
    );

    zclNode.endpoints[2].bind(
      LevelControlCluster.NAME,
      new LevelControlBoundCluster({
        onStep: (payload): Promise<void> => safeTriggerButtonPressed(this, payload.mode === 'up' ? 2 : 3, 'hold'),
      }),
    );

    // Scenes are triggered on the endpoints matching with the button number
    for (const endpointId of [1, 2, 3, 4]) {
      const endpoint = zclNode.endpoints[endpointId];
      endpoint.bind(
        ExtendedScenesCluster.NAME,
        new ScenesBoundCluster({
          onRecallScene: async (payload): Promise<void> => {
            const buttonEventType = this.getButtonEventType(payload);
            if (!buttonEventType) {
              return;
            }

            await safeTriggerButtonPressed(this, endpointId - 1, buttonEventType);
          },
        }),
      );
    }
  }

  public getButtonIndices(): number[] {
    return [...Array(4)];
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return [
      'single_press',
      'double_press',
      'triple_press',
      'long_press',
      'long_double_press',
      'long_triple_press',
      'hold',
    ];
  }

  private getButtonEventType(payload: RecallScenePayload): ButtonEventType | null {
    switch (payload.sceneId) {
      case 1:
        return 'double_press';
      case 2:
        return 'triple_press';
      case 11:
        return 'long_press';
      case 12:
        return 'long_double_press';
      case 13:
        return 'long_triple_press';
      default:
        this.debug('Unknown sceneId', payload.sceneId);
        return null;
    }
  }
}
