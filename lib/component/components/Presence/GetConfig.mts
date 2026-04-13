import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PresenceConfig } from '../Presence.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel): Promise<ResponseSuccessFrame<PresenceConfig>> {
  const requestFrame = createRequestFrame('Presence.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
