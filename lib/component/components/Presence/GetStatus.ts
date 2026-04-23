import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PresenceStatus } from '../Presence.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel): Promise<ResponseSuccessFrame<PresenceStatus>> {
  const requestFrame = createRequestFrame('Presence.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
