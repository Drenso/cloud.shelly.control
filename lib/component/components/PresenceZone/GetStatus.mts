import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PresenceZoneStatus } from '../PresenceZone.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<PresenceZoneStatus>> {
  const requestFrame = createRequestFrame('PresenceZone.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
