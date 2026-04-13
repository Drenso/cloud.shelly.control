import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PresenceStatus } from '../Presence.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<PresenceStatus>> {
  const requestFrame = createRequestFrame('Presence.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
