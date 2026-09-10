import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EMDataConfig } from '../EMData.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EMDataConfig>> {
  const requestFrame = createRequestFrame('EMData.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
