import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { ObjectStatus } from '../Object.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<ObjectStatus>> {
  const requestFrame = createRequestFrame('Object.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
