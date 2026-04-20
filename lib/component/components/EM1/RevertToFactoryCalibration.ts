import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type RevertToFactoryCalibrationResponse = {
  restart_required: boolean;
};

export default async function RevertToFactoryCalibration(
  channel: RpcChannel,
  id: number,
): Promise<ResponseSuccessFrame<RevertToFactoryCalibrationResponse>> {
  const requestFrame = createRequestFrame('EM1.RevertToFactoryCalibration', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
