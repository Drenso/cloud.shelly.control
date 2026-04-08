import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { Either5 } from '../../../util.mjs';

export type RGBCCTSetParams = {
  // Optional flip-back timer in seconds.
  toggle_after?: number;
  // Transition time in seconds - time between change from current brightness level to desired brightness level in request
  transition_duration?: number;
} & Either5<
  {
    // Brightness level
    brightness: number;
  },
  {
    // Color temperature level (in Kelvin)
    ct?: number;
  },
  {
    // Color temperature level (in Kelvin)
    rgb?: [number, number, number];
  },
  {
    // Operating mode of the light output
    mode?: 'rgb' | 'cct';
  },
  {
    // True for light on, false otherwise.
    on: boolean;
    // Set current brightness level with applied offset.
    offset?: number;
  }
>;

/**
 * This method sets the output and brightness level of the RGBCCT component.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: RGBCCTSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('RGBCCT.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
