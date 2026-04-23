import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type LightDimUpParams = {
  // Fade rate of the brightness level dimming.
  // Range [1,5] where 5 is fastest, 1 is slowest.
  // If not provided, value is defaulted to button_fade_rate
  fade_rate?: 1 | 2 | 3 | 4 | 5;
};

/**
 * This method dims up the brightness level.
 * Dimming stops with Light.DimStop.
 */
export default async function DimUp(
  channel: RpcChannel,
  id: number,
  params: LightDimUpParams = {},
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Light.DimUp', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
