import type { RequestFrame, ResponseSuccessFrame } from '../Rpc.js';

// Use the strategy design pattern to ensure RPC execution is independent of the channel
export interface RpcChannel {
  sendRequestFrame<Result extends object | null>(requestFrame: RequestFrame): Promise<ResponseSuccessFrame<Result>>;
  disconnect(): void;
}
