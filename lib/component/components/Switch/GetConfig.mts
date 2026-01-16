import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { SwitchConfig } from '../Switch.mjs';

type SwitchGetConfigParams = {
  // Identifier of the Switch component instance
  id: number;
};

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(
  channel: RpcChannel,
  params: SwitchGetConfigParams,
): Promise<ResponseSuccessFrame<SwitchConfig>> {
  const requestFrame = createRequestFrame('Switch.GetConfig', params);
  return channel.sendRequestFrame(requestFrame);
}
