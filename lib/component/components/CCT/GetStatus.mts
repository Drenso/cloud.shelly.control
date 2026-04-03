import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { CCTStatus } from '../CCT.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<CCTStatus>> {
  const requestFrame = createRequestFrame('CCT.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
