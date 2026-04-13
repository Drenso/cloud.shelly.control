import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { RecursivePartial } from '../../../util.mjs';
import type { AllowedPrimitives } from '../../Component.mjs';
import type { PresenceZoneConfig } from '../PresenceZone.mjs';

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
