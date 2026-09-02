import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CameraConfig } from '../Camera.js';

/** Obtain the component's configuration. */
export default async function GetConfig(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<CameraConfig>> {
  const requestFrame = createRequestFrame('Camera.GetConfig', { id });
  return channel.sendRequestFrame(requestFrame);
}
