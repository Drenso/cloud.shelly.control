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
      onSetOnWithButton?: (payload: OnWithButtonPayload) => void;
      onSetOffWithButton?: (payload: OffWithButtonPayload) => void;
      onToggleWithButton?: (payload: ToggleWithButtonPayload) => void;
    },
  ) {
    super();
  }

  public shellySetOnWithButton(payload: OnWithButtonPayload): void {
    this._handlers.onSetOnWithButton?.(payload);
  }

  public shellySetOffWithButton(payload: OffWithButtonPayload): void {
    this._handlers.onSetOffWithButton?.(payload);
  }

  public shellyToggleWithButton(payload: ToggleWithButtonPayload): void {
    this._handlers.onToggleWithButton?.(payload);
  }
}
