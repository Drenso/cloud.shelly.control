import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { Either } from '../../../util.mjs';

export type LightSetParams = {
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
 * This method sets the output and brightness level of the Light component.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: LightSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Light.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
