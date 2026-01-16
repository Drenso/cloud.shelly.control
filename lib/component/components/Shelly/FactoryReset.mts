import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';

/**
 * This method resets the configuration to its default state.
 */
export default async function FactoryReset(channel: RpcChannel): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Shelly.FactoryReset');
  return channel.sendRequestFrame(requestFrame);
}
