import type { RpcChannel } from '../../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.mjs';
import type { LightStatus } from '../Light.mjs';

/**
 * Obtain the component's status
 */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<LightStatus>> {
  const requestFrame = createRequestFrame('Light.GetStatus', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
