import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type RGBCCTDimDownParams = {
  // Fade rate of the brightness level dimming.
  // Range [1,5] where 5 is fastest, 1 is slowest.
  // If not provided, value is defaulted to button_fade_rate
  fade_rate?: 1 | 2 | 3 | 4 | 5;
};

/**
 * This method dims down the brightness level.
 * Dimming stops with RGBCCT.DimStop.
 */
export default async function DimDown(
  channel: RpcChannel,
  id: number,
  params: RGBCCTDimDownParams = {},
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('RGBCCT.DimDown', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
