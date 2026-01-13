import type { RpcChannel } from '../../rpc/channel/RpcChannel.mjs';
import { createRequestFrame, type ResponseSuccessFrame } from '../../rpc/Rpc.mjs';

type ShellyPutTLSClientCertParams = {
  // Contents of the client.crt file (null if you want to delete the existing data).
  data: string | null;
  // true if more data will be appended afterwards, default false.
  append?: boolean;
};

type ShellyPutTLSClientCertResult = {
  // The length of the certificate in bytes.
  len: number;
};

/**
 * This method allows uploading of a custom client certificate client.crt.
 * Because the file can be larger than what can fit in a single RPC frame,
 * the method allows uploading in chunks (for example line by line).
 */
export default async function PutTLSClientCert(
  channel: RpcChannel,
  params: ShellyPutTLSClientCertParams,
): Promise<ResponseSuccessFrame<ShellyPutTLSClientCertResult>> {
  const requestFrame = createRequestFrame('Shelly.PutTLSClientCert', params);
  return channel.sendRequestFrame(requestFrame);
}
