import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EMConfig } from '../EM.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EMConfig>> {
  const requestFrame = createRequestFrame('EM.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
