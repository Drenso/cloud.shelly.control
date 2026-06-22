import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { BooleanConfig } from '../Boolean.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<BooleanConfig>> {
  const requestFrame = createRequestFrame('Boolean.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
