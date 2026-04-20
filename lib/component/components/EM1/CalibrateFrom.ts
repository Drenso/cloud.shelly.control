import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type CalibrateFromParams = {
  // Id of the EM1 component from which the calibration data is taken
  other_id: number;
};

export type CalibrateFromResponse = {
  restart_required: boolean;
};

export default async function CalibrateFrom(
  channel: RpcChannel,
  id: number,
  params: CalibrateFromParams,
): Promise<ResponseSuccessFrame<CalibrateFromResponse>> {
  const requestFrame = createRequestFrame('EM1.CalibrateFrom', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
