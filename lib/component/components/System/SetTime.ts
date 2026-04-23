import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type SystemSetTimeParams = {
  /**
   * Unix timestamp (in UTC) to set as current time
   *
   * Fraction number,
   * where the whole part (before decimal) is in seconds,
   * fraction part in milliseconds
   *
   * (fraction part is optional and should be up to 3 digits)
   */
  unixtime: number;
};

/**
 * Method sets system time.
 */
export default async function SetTime(
  channel: RpcChannel,
  params: SystemSetTimeParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Sys.SetTime', params);
  return channel.sendRequestFrame(requestFrame);
}
