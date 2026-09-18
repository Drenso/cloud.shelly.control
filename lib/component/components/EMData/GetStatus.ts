import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EMDataStatus } from '../EMData.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EMDataStatus>> {
  const requestFrame = createRequestFrame('EMData.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
