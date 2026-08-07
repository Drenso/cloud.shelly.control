import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PM1Status } from '../PM1.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<PM1Status>> {
  const requestFrame = createRequestFrame('PM1.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
