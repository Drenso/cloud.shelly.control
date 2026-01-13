import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseFrame } from '../../rpc/Rpc.mjs';

type ShellyPutUserCAParams = {
  // Contents of the PEM file (null if you want to delete the existing data).
  data: string | null;
  // true if more data will be appended afterwards, default false.
  append?: boolean;
};

type ShellyPutUserCAResult = {
  // The length of the certificate in bytes.
  len: number;
};

/**
 * This method allows uploading of a custom certificate authority (CA) PEM bundle.
 * Because the file can be larger than what can fit in a single RPC frame,
 * the method allows uploading in chunks (for example line by line).
 */
export default async function PutUserCA(
  channel: RpcChannel,
  params: ShellyPutUserCAParams,
): Promise<ResponseFrame<ShellyPutUserCAResult>> {
  const requestFrame = createRequestFrame('Shelly.PutUserCA', params);
  return channel.sendRequestFrame(requestFrame);
}
