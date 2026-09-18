import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EMStatus } from '../EM.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EMStatus>> {
  const requestFrame = createRequestFrame('EM.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
