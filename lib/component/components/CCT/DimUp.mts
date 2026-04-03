import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type CCTDimUpParams = {
  // Fade rate of the brightness level dimming.
  // Range [1,5] where 5 is fastest, 1 is slowest.
  // If not provided, value is defaulted to button_fade_rate
  fade_rate?: 1 | 2 | 3 | 4 | 5;
};

/**
 * This method dims up the brightness level.
 * Dimming stops with CCT.DimStop.
 */
export default async function DimUp(
  channel: RpcChannel,
  id: number,
  params: CCTDimUpParams = {},
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('CCT.DimUp', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
