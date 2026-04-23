import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PresenceConfig } from '../Presence.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<PresenceConfig>> {
  const requestFrame = createRequestFrame('Presence.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
