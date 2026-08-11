import type { BoundClusterMeta } from '@drenso/homey-zigbee-library/lib/clusters/bound_clusters/BoundClusterMeta.mjs';
import zbClusters, { type OnOffClusterAttributes } from 'zigbee-clusters';
import type { ShellyOnOffClusterCommands } from './ShellyOnOffCluster.js';
import type { BoundClusterPayloadFromDefinition } from '@drenso/homey-zigbee-library/types/BoundCluster.mjs';

export type OnWithButtonPayload = BoundClusterPayloadFromDefinition<
  ShellyOnOffClusterCommands['shellySetOnWithButton']
>;
export type OffWithButtonPayload = BoundClusterPayloadFromDefinition<
  ShellyOnOffClusterCommands['shellySetOffWithButton']
>;
export type ToggleWithButtonPayload = BoundClusterPayloadFromDefinition<
  ShellyOnOffClusterCommands['shellyToggleWithButton']
>;

export default class ShellyOnOffBoundCluster extends zbClusters.BoundCluster<
  OnOffClusterAttributes,
  ShellyOnOffClusterCommands
> {
  public constructor(
    private _handlers: {
      onSetOnWithButton?: (payload: OnWithButtonPayload, meta: BoundClusterMeta) => void;
      onSetOffWithButton?: (payload: OffWithButtonPayload, meta: BoundClusterMeta) => void;
      onToggleWithButton?: (payload: ToggleWithButtonPayload, meta: BoundClusterMeta) => void;
    },
  ) {
    super();
  }

  public shellySetOnWithButton(payload: OnWithButtonPayload, meta: BoundClusterMeta): void {
    this._handlers.onSetOnWithButton?.(payload, meta);
  }

  public shellySetOffWithButton(payload: OffWithButtonPayload, meta: BoundClusterMeta): void {
    this._handlers.onSetOffWithButton?.(payload, meta);
  }

  public shellyToggleWithButton(payload: ToggleWithButtonPayload, meta: BoundClusterMeta): void {
    this._handlers.onToggleWithButton?.(payload, meta);
  }
}
