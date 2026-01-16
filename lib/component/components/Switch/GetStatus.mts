import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { SwitchStatus } from '../Switch.mjs';

type SwitchGetStatusParams = {
  // Identifier of the Switch component instance
  id: number;
};

/**
 * Obtain the component's status
 */
export default async function GetStatus(
  channel: RpcChannel,
  params: SwitchGetStatusParams,
): Promise<ResponseSuccessFrame<SwitchStatus>> {
  const requestFrame = createRequestFrame('Switch.GetStatus', params);
  return channel.sendRequestFrame(requestFrame);
}
