import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CCTStatus } from '../CCT.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<CCTStatus>> {
  const requestFrame = createRequestFrame('CCT.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
