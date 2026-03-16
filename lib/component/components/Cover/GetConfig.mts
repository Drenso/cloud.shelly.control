import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { CoverConfig } from '../Cover.mjs';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<CoverConfig>> {
  const requestFrame = createRequestFrame('Cover.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
