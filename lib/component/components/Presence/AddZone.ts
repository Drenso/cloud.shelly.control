import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RecursivePartial } from '../../../util.js';
import type { AllowedPrimitives } from '../../Component.js';
import type { PresenceZoneConfig } from '../PresenceZone.js';

export type PresenceAddZoneParams = {
  config: RecursivePartial<Omit<PresenceZoneConfig, 'id'>, AllowedPrimitives>;
};

export type PresenceAddZoneResponse = {
  added: `presencezone:${number}`;
};

/**
 * Create new PresenceZone
 */
export default async function AddZone(
  channel: RpcChannel,
  params: PresenceAddZoneParams,
): Promise<ResponseSuccessFrame<PresenceAddZoneResponse>> {
  const requestFrame = createRequestFrame('Presence.AddZone', params);
  return channel.sendRequestFrame(requestFrame);
}
