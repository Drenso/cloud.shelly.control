import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CoverResetCountersParams = {
  // Array of strings, selects which counter to reset.
  // If not provided, the method will reset all available counters.
  type?: 'aenergy'[];
};

export type CoverResetCountersResponse = {
  // Information about the active energy counter prior to reset
  // (shown if applicable)
  aenergy?: {
    // Last counter value of the total energy consumed in Watt-hours
    total: number;
  };
};

/**
 * This method resets associated counters (if applicable).
 */
export default async function ResetCounters(
  channel: RpcChannel,
  id: number,
  params?: CoverResetCountersParams,
): Promise<ResponseSuccessFrame<CoverResetCountersResponse>> {
  const requestFrame = createRequestFrame('Cover.ResetCounters', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
