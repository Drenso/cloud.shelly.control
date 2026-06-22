import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { BooleanStatus } from '../Boolean.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<BooleanStatus>> {
  const requestFrame = createRequestFrame('Boolean.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
