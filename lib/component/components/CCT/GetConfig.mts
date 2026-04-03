import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { CCTConfig } from '../CCT.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<CCTConfig>> {
  const requestFrame = createRequestFrame('CCT.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
