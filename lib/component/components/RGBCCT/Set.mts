import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { Either } from '../../../util.mjs';

export type RGBCCTSetParams = {
  // Color temperature level (in Kelvin)
  rgb?: [number, number, number];
  // Color temperature level (in Kelvin)
  ct?: number;
  // Operating mode of the light output
  // While this is documented, it doesn't work!
  // todo: question has been asked in the Shelly Teams
  // mode?: 'rgb' | 'cct';
  // Optional flip-back timer in seconds.
  toggle_after?: number;
  // Transition time in seconds - time between change from current brightness level to desired brightness level in request
  transition_duration?: number;
} & Either<
  {
    // Brightness level
    brightness: number;
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
