import type { RequestFrame, ResponseFrame } from '../Rpc.mjs';

// Use the strategy design pattern to ensure RPC execution is independent of the channel
export interface RpcChannel {
  sendRequestFrame<Result extends object>(requestFrame: RequestFrame): Promise<ResponseFrame<Result>>;
}
