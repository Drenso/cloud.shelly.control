import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

export type SwitchToggleResponse = {
  // True if the switch was on before the method was executed, false otherwise.
  was_on: boolean;
};

/**
 * This method toggles the output state.
 */
export default async function Toggle(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<SwitchToggleResponse>> {
  const requestFrame = createRequestFrame('Switch.Toggle', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
