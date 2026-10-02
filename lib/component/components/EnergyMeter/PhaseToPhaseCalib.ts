import type { RpcChannel } from '../../../rpc/channel/RpcChannel.js';
import { createRequestFrame, type ResponseSuccessFrame } from '../../../rpc/Rpc.js';

export type EnergyMeterPhaseCalibrationParameters = {
  from: 'a' | 'b' | 'c' | 'n';
  to: 'a' | 'b' | 'c' | 'n';
};

export type EnergyMeterPhaseCalibrationResponse = {
  restart_required: true;
};

/**
 * Calibrate a phase CT from another phase's CT (if applicable).
 *
 * In order to be able to calibrate correctly the phase voltages need to be equal
 * i.e. if we calibrate a CT from phase c to a CT on phase a, the voltage of phase c and phase a needs to be the same
 * (phases are connected on the same voltage line).
 *
 * The minimum power allowed for the calibration to take place is 500W.
 *
 * The method takes around 5 seconds to complete, and the response is delayed with the request
 *
 * answer - restart_required: true in case of success or error message in case of fail.
 *
 * The reasons for the calibration to fail may be
 * - deviation in measurement after calibration on the from and to phases that indicate incorrect input phases setup,
 * incorrect CTs or other problem.
 */
export default async function PhaseToPhaseCalib(
  channel: RpcChannel,
  id: number,
  params: EnergyMeterPhaseCalibrationParameters,
): Promise<ResponseSuccessFrame<EnergyMeterPhaseCalibrationResponse>> {
  const requestFrame = createRequestFrame('EM.PhaseToPhaseCalib', { ...params, id });
  return channel.sendRequestFrame(requestFrame);
}
