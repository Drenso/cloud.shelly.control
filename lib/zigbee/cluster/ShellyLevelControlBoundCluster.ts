import type { BoundClusterPayloadFromDefinition } from '@drenso/homey-zigbee-library/types/BoundCluster.mjs';
import zbClusters, { type LevelControlClusterAttributes } from 'zigbee-clusters';
import type { ShellyLevelControlClusterCommands } from './ShellyLevelControlCluster.js';

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
      onMoveToLevelWithButton?: (payload: MoveToLevelWithButtonPayload) => void;
      onMoveToLevelWithOnOffAndButton?: (payload: MoveToLevelWithOnOffAndButtonPayload) => void;
      onStepWithOnOffAndButton?: (payload: StepWithOnOffAndButtonPayload) => void;
    },
  ) {
    super();
  }

  public shellyMoveToLevelWithButton(payload: MoveToLevelWithButtonPayload): void {
    this._handlers.onMoveToLevelWithButton?.(payload);
  }

  public shellyMoveToLevelWithOnOffAndButton(payload: MoveToLevelWithOnOffAndButtonPayload): void {
    this._handlers.onMoveToLevelWithOnOffAndButton?.(payload);
  }

  public shellyStepWithOnOffAndButton(payload: StepWithOnOffAndButtonPayload): void {
    this._handlers.onStepWithOnOffAndButton?.(payload);
  }
}
