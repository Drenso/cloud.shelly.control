import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { NumberConfig } from '../Number.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<NumberConfig>> {
  const requestFrame = createRequestFrame('Number.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
