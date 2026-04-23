import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { Either } from '../../../util.js';

export type LightSetAllParams = {
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
 * This method (if applicable) sets the output and brightness level of all Light components in the device.
 */
export default async function SetAll(
  channel: RpcChannel,
  params: LightSetAllParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Light.SetAll', params);
  return channel.sendRequestFrame(requestFrame);
}
