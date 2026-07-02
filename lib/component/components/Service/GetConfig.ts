import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { ServiceConfig } from '../Service.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<ServiceConfig>> {
  const requestFrame = createRequestFrame('Service.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
