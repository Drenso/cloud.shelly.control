import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { SwitchStatus } from '../Switch.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<SwitchStatus>> {
  const requestFrame = createRequestFrame('Switch.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
