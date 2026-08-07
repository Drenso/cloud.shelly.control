import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { PM1Config } from '../PM1.js';

/**
 * Obtain the component's configuration
 */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<PM1Config>> {
  const requestFrame = createRequestFrame('PM1.GetConfig', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
