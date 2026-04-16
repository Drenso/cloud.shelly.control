import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { FloodStatus } from '../Flood.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<FloodStatus>> {
  const requestFrame = createRequestFrame('Flood.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
