import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * This method stops the dimming of the brightness level.
 */
export default async function DimStop(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('RGBCCT.DimStop', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
