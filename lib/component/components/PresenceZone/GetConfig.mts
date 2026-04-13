import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { PresenceZoneConfig } from '../PresenceZone.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<PresenceZoneConfig>> {
  const requestFrame = createRequestFrame('PresenceZone.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
