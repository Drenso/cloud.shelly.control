import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

/**
 * Calibrate the cover.
 *
 * Cover will not accept the command if:
 * - Cover has any of the following errors set at the time of the request:
 *   `safety_switch`, `overpower`, `overvoltage`, `undervoltage`, `overcurrent`, `obstruction`, `overtemp`
 * - Cover is moving at the time of the request
 * - Cover is already calibrating
 *
 * **Note:**
 * 1) The calibration procedure will be aborted if:
 *    - Cover fails to reach a fully open / fully closed position within the configured timeout `maxtime_open` / `maxtime_close`.
 *      This can happen if
 *       + `maxtime_open` / `maxtime_close` are set too low and the Cover stops before reaching the end positions
 *       + there is a physical problem with the limit switches and the end positions can not be detected;
 *    - Any Cover safety feature (except obstruction detection, see point 3) is triggered during the calibration procedure
 *      (overpower, overtemp, etc.);
 *    - Cover receives an external command to stop during the calibration procedure (via input, RPC call, etc.);
 *    - Cover reports a mismatch between motor feedback and expected state during the calibration procedure,
 *      e.g. motor turning in the wrong direction;
 *    - The device reboots (for any reason, incl. ota, factory reset, etc.) during the calibration procedure;
 *
 * 2) Once started, the calibration procedure invalidates any previous calibration data
 *    and only saves new calibration data if the complete procedure finishes successfully. If the calibration procedure is interrupted due to any of the reasons described in point 1), calibration data will not be available.
 * 3) During calibration, obstruction detection is ignored
 *    and the Cover will not stop if the power consumption rises above the obstruction detection threshold.
 */
export default async function Calibrate(channel: RpcChannel, id: number): Promise<ResponseSuccessFrame<null>> {
  const requestFrame = createRequestFrame('Cover.Calibrate', { id: id });
  return channel.sendRequestFrame(requestFrame);
}
