import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type SwitchSetParams = {
  // True for switch on, false otherwise.
  on: boolean;
  // Optional flip-back timer in seconds.
  toggle_after?: number;
};

export type SwitchSetResponse = {
  // True if the switch was on before the method was executed, false otherwise.
  was_on: boolean;
};

/**
 * This method sets the output of the Switch component to on or off.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: SwitchSetParams,
): Promise<ResponseSuccessFrame<SwitchSetResponse>> {
  const requestFrame = createRequestFrame('Switch.Set', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
