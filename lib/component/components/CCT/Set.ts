import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { Either3 } from '../../../util.js';

export type CCTSetParams = {
  // Optional flip-back timer in seconds.
  toggle_after?: number;
  // Transition time in seconds - time between change from current brightness level to desired brightness level in request
  transition_duration?: number;
} & Either3<
  {
    // Brightness level
    brightness: number;
  },
  {
    // Color temperature level (in Kelvin)
    ct: number;
  },
  {
    // True for light on, false otherwise.
    on: boolean;
    // Set current brightness level with applied offset.
    offset?: number;
  }
>;

/**
 * This method sets the output and brightness level of the CCT component.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: CCTSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('CCT.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
