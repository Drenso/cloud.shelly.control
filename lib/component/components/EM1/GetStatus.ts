import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EM1Status } from '../EM1.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EM1Status>> {
  const requestFrame = createRequestFrame('EM1.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
