import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { ServiceStatus } from '../Service.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<ServiceStatus>> {
  const requestFrame = createRequestFrame('Service.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
