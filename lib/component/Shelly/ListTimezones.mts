import { createRequestFrame, type ResponseSuccessFrame } from '../../rpc/Rpc.mjs';
import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';

type ShellyListTimezonesParams = {
  offset?: number;
};

type ShellyListTimezonesResponse = {
  // List of timezones
  timezones: string[];
  // Index of the first entry in the result
  offset: number;
  // Total number of available timezones
  total: number;
};

/**
 * This method returns list of timezones, it supports paging.
 */
export default async function ListTimezones(
  channel: RpcChannel,
  params?: ShellyListTimezonesParams,
): Promise<ResponseSuccessFrame<ShellyListTimezonesResponse>> {
  const requestFrame = createRequestFrame('Shelly.ListTimezones', params);
  return channel.sendRequestFrame(requestFrame);
}
