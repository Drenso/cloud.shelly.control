import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { LightStatus } from '../Light.js';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<LightStatus>> {
  const requestFrame = createRequestFrame('Light.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
