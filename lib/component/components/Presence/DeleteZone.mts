import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type PresenceDeleteZoneParams = {
  id: number;
};

/**
 * Delete existing PresenceZone.
 *
 * Default presence zone can't be deleted.
 * Its key can be found in config section in readonly parameter `main_zone`
 */
export default async function DeleteZone(
  channel: RpcChannel,
  params: PresenceDeleteZoneParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Presence.DeleteZone', params);
  return channel.sendRequestFrame(requestFrame);
}
