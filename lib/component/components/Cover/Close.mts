import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type CoverCloseParams = {
  /**
   * If duration is not provided, Cover will fully close, unless it times out because of `maxtime_close` first.
   * If duration (seconds) is provided, Cover will move in the close direction for the specified time.
   *
   * duration must be in the range [0.1..`maxtime_close`]
   */
  duration?: number;
};

/**
 * Close the cover.
 *
 * Cover will not accept the command if:
 * - An `overvoltage` error is set at the time of the request
 * - An `undervoltage` error is set at the time of the request
 * - An `overtemp` error is set at the time of the request
 * - An engaged `safety_switch` prohibits movement in the requested direction
 * - Cover calibration is running at the time of the request
 */
export default async function Close(
  channel: RpcChannel,
  id: number,
  params: CoverCloseParams = {},
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Cover.Close', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
