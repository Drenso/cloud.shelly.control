import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CameraSetParams = {
  /** Optional. Whether the camera is armed. */
  arm?: boolean;
  /** Optional. Privacy mode. When enabled, the streamer is suspended: video and audio capture stop, the speaker is disabled, and no streams or recordings can be served until privacy mode is turned off. */
  privacy?: boolean;
};

/**
 * Arm/disarm the camera and/or turn privacy mode on or off.
 * At least one of arm or privacy must be provided; omitted parameters are left unchanged.
 * The new values are persisted and reflected in the status.
 * Turning privacy on suspends the streamer: video and audio capture stop and the speaker is disabled; turning it off resumes it.
 */
export default async function Set(
  channel: RpcChannel,
  id: number,
  params: CameraSetParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Camera.Set', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
