import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { SwitchStatus } from '../Switch.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<SwitchStatus>> {
  const requestFrame = createRequestFrame('Switch.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
