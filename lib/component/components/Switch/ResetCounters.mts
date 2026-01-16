import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

type SwitchResetCountersParams = {
  // Identifier of the Switch component instance
  id: number;
  // Array of strings, selects which counter to reset.
  // If not provided, the method will reset all available counters.
  type?: ('aenergy' | 'ret_aenergy')[];
};

type SwitchResetCountersResponse = {
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
  params: SwitchResetCountersParams,
): Promise<ResponseSuccessFrame<SwitchResetCountersResponse>> {
  const requestFrame = createRequestFrame('Switch.ResetCounters', params);
  return channel.sendRequestFrame(requestFrame);
}
