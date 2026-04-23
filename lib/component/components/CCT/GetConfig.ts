import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CCTConfig } from '../CCT.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<CCTConfig>> {
  const requestFrame = createRequestFrame('CCT.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
