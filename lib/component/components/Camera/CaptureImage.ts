import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CameraCaptureImageParams = {
  /** Optional. Stream id to capture from (default 0). */
  stream?: number;
};

export type CameraCaptureImageResponse = {
  /** Unique identifier (UUID) for the captured image */
  media_id: string;
};

/**
 * Capture a single still image from a stream.
 * The image is uploaded to the cloud and, if local storage is mounted, also stored on the SD card.
 * The returned media_id can be used to retrieve the image once it has been processed (see the media_ready notification).
 */
export default async function CaptureImage(
  channel: RpcChannel,
  id: number,
  params: CameraCaptureImageParams,
): Promise<ResponseSuccessFrame<CameraCaptureImageResponse>> {
  const requestFrame = createRequestFrame('Camera.CaptureImage', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
