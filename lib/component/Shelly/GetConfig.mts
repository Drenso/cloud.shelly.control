import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseFrame } from '../../rpc/Rpc.mjs';

// TODO improve the typing of Config
/**
 * This method returns the configuration of all the components of the device.
 */
export default async function GetConfig<Config extends object>(channel: RpcChannel): Promise<ResponseFrame<Config>> {
  const requestFrame = createRequestFrame('Shelly.GetConfig');
  return channel.sendRequestFrame(requestFrame);
}
