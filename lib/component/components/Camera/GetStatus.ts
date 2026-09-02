import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { CameraStatus } from '../Camera.js';

/** Obtain the component's status. */
export default async function GetStatus(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<CameraStatus>> {
  const requestFrame = createRequestFrame('Camera.GetStatus', { id });
  return channel.sendRequestFrame(requestFrame);
}
