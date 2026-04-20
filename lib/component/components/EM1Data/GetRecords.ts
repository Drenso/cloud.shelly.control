import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type GetRecordsParams = {
  /** UNIX timestamp of the first interval. Used for selecting the next data chunk when the response is too large to fit in one call. Default is 0. */
  ts?: number;
};

export default function GetRecords(
  channel: RpcChannel,
  id: number,
  params: GetRecordsParams = {},
): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('EM1Data.GetRecords', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
