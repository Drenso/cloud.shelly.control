import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type CoverOpenParams = {
  /**
   * If duration is not provided, Cover will fully open, unless it times out because of `maxtime_open` first.
   * If duration (seconds) is provided, Cover will move in the open direction for the specified time.
   *
   * duration must be in the range [0.1..`maxtime_open`]
   */
  duration?: number;
};

/**
 * Open the cover.
 *
 * Cover will not accept the command if:
 * - An `overvoltage` error is set at the time of the request
 * - An `undervoltage` error is set at the time of the request
 * - An `overtemp` error is set at the time of the request
 * - An engaged `safety_switch` prohibits movement in the requested direction
 * - Cover calibration is running at the time of the request
 */
export default async function Open(
  channel: RpcChannel,
  id: number,
  params: CoverOpenParams = {},
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Cover.Open', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
