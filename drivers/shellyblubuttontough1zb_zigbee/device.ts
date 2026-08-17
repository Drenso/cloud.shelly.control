import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import OnOffBoundCluster from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/OnOffBoundCluster.mjs';
import ScenesBoundCluster from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/ScenesBoundCluster.mjs';
import ExtendedScenesCluster from '@drenso/homey-zigbee-library/lib/clusters/ExtendedScenesCluster.mjs';
import { OnOffCluster, type ZCLNode } from 'zigbee-clusters';
import type { ButtonEventTypesDeviceInterface } from '../../lib/capabilityInterfaces.js';
import { type ButtonEventType, safeTriggerSingleButtonPressed } from '../../lib/flow/buttonFlows.js';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

export default class ShellyBluButtonTough1ZBZigbeeDevice
  extends ShellyZigbeeDevice
  implements ButtonEventTypesDeviceInterface
{
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);

    const toggleMapping: { endpoint: number; type: ButtonEventType }[] = [
      { endpoint: 1, type: 'single_press' },
      { endpoint: 2, type: 'double_press' },
      { endpoint: 3, type: 'triple_press' },
    ];
    for (const map of toggleMapping) {
      zclNode.endpoints[map.endpoint].bind(
        OnOffCluster.NAME,
        new OnOffBoundCluster({
          onToggle: (): Promise<void> => safeTriggerSingleButtonPressed(this, map.type),
        }),
      );
    }

    const sceneMapping: { endpoint: number; type: ButtonEventType }[] = [
      { endpoint: 1, type: 'long_press' },
      { endpoint: 2, type: 'long_double_press' },
      { endpoint: 3, type: 'long_triple_press' },
    ];
    for (const map of sceneMapping) {
      zclNode.endpoints[map.endpoint].bind(
        ExtendedScenesCluster.NAME,
        new ScenesBoundCluster({
          onRecallScene: async (payload): Promise<void> => {
            if (payload.sceneId !== map.endpoint) {
              return;
            }

            await safeTriggerSingleButtonPressed(this, map.type);
          },
        }),
      );
    }
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'double_press', 'triple_press', 'long_press', 'long_double_press', 'long_triple_press'];
  }
}
