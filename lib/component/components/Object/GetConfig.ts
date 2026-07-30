import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { ObjectConfig } from '../Object.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<ObjectConfig>> {
  const requestFrame = createRequestFrame('Object.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
