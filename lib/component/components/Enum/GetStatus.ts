import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { EnumStatus } from '../Enum.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<EnumStatus>> {
  const requestFrame = createRequestFrame('Enum.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
