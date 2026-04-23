import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PresenceZoneStatus } from '../PresenceZone.js';

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
