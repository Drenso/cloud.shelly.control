import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

type SwitchToggleParams = {
  // Identifier of the Switch component instance
  id: number;
};

type SwitchToggleResponse = {
  // True if the switch was on before the method was executed, false otherwise.
  was_on: boolean;
};

/**
 * This method toggles the output state.
 */
export default async function Toggle(
  channel: RpcChannel,
  params: SwitchToggleParams,
): Promise<ResponseSuccessFrame<SwitchToggleResponse>> {
  const requestFrame = createRequestFrame('Switch.Toggle', params);
  return channel.sendRequestFrame(requestFrame);
}
