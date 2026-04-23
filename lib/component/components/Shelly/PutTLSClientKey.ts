import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

type ShellyPutTLSClientKeyParams = {
  // Contents of the client.key file (null if you want to delete the existing data).
  data: string | null;
  // true if more data will be appended afterwards, default false.
  append?: boolean;
};

type ShellyPutTLSClientKeyResult = {
  // The length of the certificate in bytes.
  len: number;
};

/**
 * This method allows uploading of a custom client key client.key.
 * Because the file can be larger than what can fit in a single RPC frame,
 * the method allows uploading in chunks (for example line by line).
 */
export default async function PutTLSClientKey(
  channel: RpcChannel,
  params: ShellyPutTLSClientKeyParams,
): Promise<ResponseSuccessFrame<ShellyPutTLSClientKeyResult>> {
  const requestFrame = createRequestFrame('Shelly.PutTLSClientKey', params);
  return channel.sendRequestFrame(requestFrame);
}
