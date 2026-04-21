import zbClusters from 'zigbee-clusters';
import type { LevelMeta, LevelMovePayload, LevelPayload } from '../../../drivers/shellyblurc_zigbee/device.mjs';

type MoveOnOffType = (payload: LevelMovePayload, meta: LevelMeta) => void;
type StepOnOffType = (payload: LevelPayload, meta: LevelMeta) => void;

export default class LevelControlBoundCluster extends zbClusters.BoundCluster {
  private readonly _onStep?: StepOnOffType;
  private readonly _onMoveToLevel?: MoveOnOffType;

  public constructor(onMoveToLevel?: MoveOnOffType, onStep?: StepOnOffType) {
    super();
    this._onStep = onStep;
    this._onMoveToLevel = onMoveToLevel;
  }

  public moveToLevel(payload: LevelMovePayload, meta: LevelMeta): void {
    if (typeof this._onMoveToLevel === 'function') {
      this._onMoveToLevel(payload, meta);
    }
  }

  public moveToLevelWithOnOff(payload: LevelMovePayload, meta: LevelMeta): void {
    this.moveToLevel(payload, meta);
  }

  public step(payload: LevelPayload, meta: LevelMeta): void {
    if (typeof this._onStep === 'function') {
      this._onStep(payload, meta);
    }
  }

  public stepWithOnOff(payload: LevelPayload, meta: LevelMeta): void {
    this.step(payload, meta);
  }
}
