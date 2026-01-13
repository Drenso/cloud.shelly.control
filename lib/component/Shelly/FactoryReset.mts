import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseFrame } from '../../rpc/Rpc.mjs';

/**
 * This method resets the configuration to its default state.
 */
export default async function FactoryReset(channel: RpcChannel): Promise<ResponseFrame<null>> {
  const requestFrame = createRequestFrame('Shelly.FactoryReset');
  return channel.sendRequestFrame(requestFrame);
}
