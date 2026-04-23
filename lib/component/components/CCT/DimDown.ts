import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CCTDimDownParams = {
  // Fade rate of the brightness level dimming.
  // Range [1,5] where 5 is fastest, 1 is slowest.
  // If not provided, value is defaulted to button_fade_rate
  fade_rate?: 1 | 2 | 3 | 4 | 5;
};

/**
 * This method dims down the brightness level.
 * Dimming stops with CCT.DimStop.
 */
export default async function DimDown(
  channel: RpcChannel,
  id: number,
  params: CCTDimDownParams = {},
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('CCT.DimDown', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
