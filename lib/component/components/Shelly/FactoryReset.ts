import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * This method resets the configuration to its default state.
 */
export default async function FactoryReset(channel: RpcChannel): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Shelly.FactoryReset');
  return channel.sendRequestFrame(requestFrame);
}
