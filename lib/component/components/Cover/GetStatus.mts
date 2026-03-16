import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { CoverStatus } from '../Cover.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<CoverStatus>> {
  const requestFrame = createRequestFrame('Cover.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
