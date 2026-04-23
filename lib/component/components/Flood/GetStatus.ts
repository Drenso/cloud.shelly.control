import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { FloodStatus } from '../Flood.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<FloodStatus>> {
  const requestFrame = createRequestFrame('Flood.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
