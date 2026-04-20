import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type GetDataParams = {
  /** UNIX timestamp of the first record. Any record with data having a timestamp between ts and end_ts will be retrieved. */
  ts: number;
  /** UNIX timestamp of the last record to get (if available). If the response is too big, it will be chunked. The default is to get all available records without limit. */
  end_ts?: number;
  /** If false will not print the keys array in the response. The default is true. */
  add_keys?: boolean;
};

type DataKey = {
  ts: number;
  period: string;
  values: number[][];
};

export type GetDataResult = {
  keys?: string[];
  data: DataKey[];
  next_record_ts?: number;
};

export default function GetData(
  channel: RpcChannel,
  id: number,
  params: GetDataParams,
): Promise<ResponseSuccessFrame<GetDataResult>> {
  const requestFrame = createRequestFrame('EM1Data.GetData', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
