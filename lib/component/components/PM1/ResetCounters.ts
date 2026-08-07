import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type PM1ResetCountersParams = {
  // Array of strings, selects which counter to reset.
  // If not provided, the method will reset all available counters.
  type?: ('aenergy' | 'ret_aenergy')[];
};

export type PM1ResetCountersResponse = {
  // Information about the active energy counter prior to reset
  // (shown if applicable)
  aenergy?: {
    // Last counter value of the total energy consumed in Watt-hours
    total: number;
  };
  // Information about the returned active energy counter prior to reset
  // (shown if applicable)
  ret_aenergy?: {
    // Last counter value of the total returned energy consumed in Watt-hours
    total: number;
  };
};

/**
 * This method resets associated counters (if applicable).
 */
export default async function ResetCounters(
  channel: RpcChannel,
  id: number,
  params?: PM1ResetCountersParams,
): Promise<ResponseSuccessFrame<PM1ResetCountersResponse>> {
  const requestFrame = createRequestFrame('PM1.ResetCounters', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
