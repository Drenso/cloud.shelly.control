import type { RequestFrame, ResponseFrame } from '../Rpc.mjs';

export async function sendRequestFrame(address: string, request: RequestFrame): Promise<ResponseFrame> {
  // TODO change to HTTPS
  const response = await fetch(`http://${address}/rpc`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return (await response.json()) as ResponseFrame;
}

// TODO authentication
// See documentation: https://shelly-api-docs.shelly.cloud/gen2/General/Authentication/#authentication
// See example: https://github.com/ALLTERCO/gen2-sample-code/blob/main/http-digest-auth/src/shellyHttpCall.ts
