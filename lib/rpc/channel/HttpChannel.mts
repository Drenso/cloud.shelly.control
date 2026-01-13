import type { RpcChannel } from './RpcChannel.mjs';
import type { RequestFrame, ResponseFrame } from '../Rpc.mjs';

// TODO authentication
// See documentation: https://shelly-api-docs.shelly.cloud/gen2/General/Authentication/#authentication
// See example: https://github.com/ALLTERCO/gen2-sample-code/blob/main/http-digest-auth/src/shellyHttpCall.ts

export default class HttpChannel implements RpcChannel {
  readonly address: string;
  constructor(address: string) {
    this.address = address;
  }

  async sendRequestFrame<Result extends object | null>(requestFrame: RequestFrame): Promise<ResponseFrame<Result>> {
    // TODO change to HTTPS
    const addressString = this.address;
    const response = await fetch(`http://${addressString}/rpc`, {
      method: 'POST',
      body: JSON.stringify(requestFrame),
    });
    return (await response.json()) as ResponseFrame<Result>;
  }
}
