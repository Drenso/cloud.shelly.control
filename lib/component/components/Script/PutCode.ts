import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';
import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';

export type ScriptPutCodeParams = {
  /**
   * The code which will be included in the script.
   *
   * The length must be greater than 0
   */
  code: string;
  /**
   * Whether the included code should be appended to the script.
   * If set to `false`, the existing code will be overwritten.
   *
   * Default value: `false` */
  append?: boolean;
};

export type ScriptPutCodeResponse = {
  /** The total code length in bytes */
  len: number;
};

/**
 * This method allows uploading code to an existing, but not currently running script.
 *
 * If the script is running, it must be stopped before trying to overwrite, otherwise an error is returned.
 *
 * Furthermore, the maximum size of a script is limited, see the section on resource limits:
 * https://shelly-api-docs.shelly.cloud/gen2/Scripts/LanguageReference#resource-limits
 */
export default async function PutCode(
  channel: RpcChannel,
  id: number,
  params: ScriptPutCodeParams,
): Promise<ResponseSuccessFrame<ScriptPutCodeResponse>> {
  const requestFrame = createRequestFrame('Script.PutCode', { ...params, id: id });
  return channel.sendRequestFrame(requestFrame);
}
