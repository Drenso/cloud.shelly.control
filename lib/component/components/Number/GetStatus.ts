import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { NumberStatus } from '../Number.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<NumberStatus>> {
  const requestFrame = createRequestFrame('Number.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
