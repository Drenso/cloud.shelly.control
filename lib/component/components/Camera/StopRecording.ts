import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CameraStopRecordingParams = {
  /** Optional. Unique identifier of the recording to stop, as returned by Camera.StartRecording. When omitted, all currently active recordings are stopped. */
  rec_id?: string;
};

/** Stop one or all active recordings. */
export default async function StopRecording(
  channel: RpcChannel,
  id: number,
  params: CameraStopRecordingParams,
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Camera.StopRecording', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
