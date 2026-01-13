import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseFrame } from '../../rpc/Rpc.mjs';

// TODO improve the typing of Status
/**
 * This method returns the status of all the components of the device.
 */
export default async function GetStatus<Status extends object>(channel: RpcChannel): Promise<ResponseFrame<Status>> {
  const requestFrame = createRequestFrame('Shelly.GetStatus');
  return channel.sendRequestFrame(requestFrame);
}
