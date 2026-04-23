import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type InputResetCountersParams = {
  /**
   * Array of strings, selects which counter to reset.
   *
   * If not provided, the method will reset all available counters.
   */
  type?: 'counts'[];
};

export type InputResetCountersResponse = {
  /**
   * Information about the input counter prior to reset
   *
   * (shown if applicable)
   */
  counts?: {
    /**
     * Last total counter value
     */
    total: number;
  };
};

/**
 * This method resets associated counters (if applicable).
 */
export default async function ResetCounters(
  channel: RpcChannel,
  id: number,
  params?: InputResetCountersParams,
): Promise<ResponseSuccessFrame<InputResetCountersResponse>> {
  const requestFrame = createRequestFrame('Input.ResetCounters', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
