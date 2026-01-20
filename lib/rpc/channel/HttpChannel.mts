import type { RpcChannel } from './RpcChannel.mjs';
import type { RequestFrame, ResponseErrorFrame, ResponseFrame, ResponseSuccessFrame } from '../Rpc.mjs';
import { RpcError } from '../RpcError.mjs';

// TODO authentication
// See documentation: https://shelly-api-docs.shelly.cloud/gen2/General/Authentication/#authentication
// See example: https://github.com/ALLTERCO/gen2-sample-code/blob/main/http-digest-auth/src/shellyHttpCall.ts

export default class HttpChannel implements RpcChannel {
  readonly address: string;
  constructor(address: string) {
    this.address = address;
  }

  disconnect(): void {}

  async sendRequestFrame<Result extends object | null>(
    requestFrame: RequestFrame,
  ): Promise<ResponseSuccessFrame<Result>> {
    // TODO change to HTTPS
    const addressString = this.address;
    const response = await fetch(`http://${addressString}/rpc`, {
      method: 'POST',
      body: JSON.stringify(requestFrame),
    });

    // TODO create a reusable method that handles errors properly
    const json = (await response.json()) as ResponseFrame<Result>;
    const error = json as ResponseErrorFrame;
    const result = json as ResponseSuccessFrame<Result>;
    if (error.error !== undefined) {
      const { code, message } = error.error;
      throw new RpcError(code, message);
    }
    return result;
  }
}
