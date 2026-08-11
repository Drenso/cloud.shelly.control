import zbClusters, { type LevelControlClusterAttributes } from 'zigbee-clusters';
import type { ShellyLevelControlClusterCommands } from './ShellyLevelControlCluster.js';
import type { BoundClusterMeta } from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/BoundClusterMeta.mjs';
import type { BoundClusterPayloadFromDefinition } from '@drenso/homey-zigbee-library/types/BoundCluster.mjs';

export type MoveToLevelWithButtonPayload = BoundClusterPayloadFromDefinition<
  ShellyLevelControlClusterCommands['shellyMoveToLevelWithButton']
>;
export type MoveToLevelWithOnOffAndButtonPayload = BoundClusterPayloadFromDefinition<
  ShellyLevelControlClusterCommands['shellyMoveToLevelWithOnOffAndButton']
>;
export type StepWithOnOffAndButtonPayload = BoundClusterPayloadFromDefinition<
  ShellyLevelControlClusterCommands['shellyStepWithOnOffAndButton']
>;

export default class ShellyLevelControlBoundCluster extends zbClusters.BoundCluster<
  LevelControlClusterAttributes,
  ShellyLevelControlClusterCommands
> {
  public constructor(
    private _handlers: {
      onMoveToLevelWithButton?: (payload: MoveToLevelWithButtonPayload, meta: BoundClusterMeta) => void;
      onMoveToLevelWithOnOffAndButton?: (payload: MoveToLevelWithOnOffAndButtonPayload, meta: BoundClusterMeta) => void;
      onStepWithOnOffAndButton?: (payload: StepWithOnOffAndButtonPayload, meta: BoundClusterMeta) => void;
    },
  ) {
    super();
  }

  public shellyMoveToLevelWithButton(payload: MoveToLevelWithButtonPayload, meta: BoundClusterMeta): void {
    this._handlers.onMoveToLevelWithButton?.(payload, meta);
  }

  public shellyMoveToLevelWithOnOffAndButton(
    payload: MoveToLevelWithOnOffAndButtonPayload,
    meta: BoundClusterMeta,
  ): void {
    this._handlers.onMoveToLevelWithOnOffAndButton?.(payload, meta);
  }

  public shellyStepWithOnOffAndButton(payload: StepWithOnOffAndButtonPayload, meta: BoundClusterMeta): void {
    this._handlers.onStepWithOnOffAndButton?.(payload, meta);
  }
}
