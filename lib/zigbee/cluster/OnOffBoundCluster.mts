import zbClusters from 'zigbee-clusters';
import type { OnOffMeta } from '../../../drivers/shellyblurc_zigbee/device.mjs';

type OnOffType = (meta: OnOffMeta) => void;
export default class OnOffBoundCluster extends zbClusters.BoundCluster {
  private readonly _onSetOff?: OnOffType;
  private readonly _onSetOn?: OnOffType;

  public constructor(onSetOff?: OnOffType, onSetOn?: OnOffType) {
    super();
    this._onSetOff = onSetOff;
    this._onSetOn = onSetOn;
  }

  public setOn(payload: never, meta: OnOffMeta): void {
    if (typeof this._onSetOn === 'function') {
      this._onSetOn(meta);
    }
  }

  public setOff(payload: never, meta: OnOffMeta): void {
    if (!this._onSetOff) {
      return;
    }

    this._onSetOff(meta);
  }
}
