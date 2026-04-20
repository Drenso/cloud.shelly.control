import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type GetNetEnergiesParams = {
  /** UNIX timestamp of the first record. It must align with the first second of the selected time granularity */
  ts: number;
  /** UNIX timestamp of the last record to get (if available). Default is to get all available records, if the response is too big - it will be chunked. */
  end_ts?: number;
  /** Period over which to accumulate energies, possible values are 300, 900, 1800, or 3600 seconds */
  period: 300 | 900 | 1800 | 3600;
  /** If false will not print the keys array in the response. The default is true. */
  add_keys?: boolean;
};

type NetEnergiesKey = {
  ts: number;
  period: string;
  values: number[][];
};

export type GetNetEnergiesResult = {
  keys?: string[];
  data: NetEnergiesKey[];
  next_record_ts?: number;
};

export default function GetNetEnergies(
  channel: RpcChannel,
  id: number,
  params: GetNetEnergiesParams,
): Promise<ResponseSuccessFrame<GetNetEnergiesResult>> {
  const requestFrame = createRequestFrame('EM1Data.GetNetEnergies', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
