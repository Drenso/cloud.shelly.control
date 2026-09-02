import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CameraStartRecordingParams = {
  /** Optional. Recording duration in seconds (default 60). The recording stops automatically once this duration elapses, unless Camera.StopRecording is called first. */
  duration?: number;
  /** Optional. Stream id to record from (default 0). */
  stream?: number;
};

export type CameraStartRecordingResponse = {
  /** Unique identifier (UUID) of the new recording */
  rec_id: string;
};

/**
 * Start a video recording.
 * The recording is uploaded to the cloud and, if local storage is mounted, also stored on the SD card.
 * The returned rec_id is used to identify the recording in subsequent Camera.StopRecording calls and in the recordings field of Camera.GetStatus.
 */
export default async function StartRecording(
  channel: RpcChannel,
  id: number,
  params: CameraStartRecordingParams,
): Promise<ResponseSuccessFrame<CameraStartRecordingResponse>> {
  const requestFrame = createRequestFrame('Camera.StartRecording', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
