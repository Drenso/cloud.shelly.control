import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { FloodConfig } from '../Flood.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<FloodConfig>> {
  const requestFrame = createRequestFrame('Flood.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
