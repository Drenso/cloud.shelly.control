import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';

export type CircuitBreakerGetLogParams = {
  /** Load logs created after the specified Unix timestamp */
  after?: number;
};

export type CircuitBreakerGetLogResponse = {
  /** List with last 50 activity records */
  records: CircuitBreakerLog[];
};

type CircuitBreakerLog = {
  /** Unix timestamp (in UTC), Device uptime when time is not synced from NTP server. */
  ts: number;
  /** Breaker lever state. true for engaged breaker lever, otherwise false */
  output: boolean;
  /** Source of the activity, for example: init, WS_in, http, ... */
  source: string;
};

export default async function GetLog(
  channel: RpcChannel,
  id: number,
  params?: CircuitBreakerGetLogParams,
): Promise<ResponseSuccessFrame<CircuitBreakerGetLogResponse>> {
  const requestFrame = createRequestFrame('CB.GetLog', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
