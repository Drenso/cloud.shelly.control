import type ShellyApp from '../../app.js';
import type { MultiZoneCapabilityDeviceInterface } from '../capabilityInterfaces.js';

export function registerPresenceFlowCards(app: ShellyApp): void {
  const alarmPresenceZoneRunListener = async (args: { zones: string[] }, state: { zone: number }): Promise<boolean> => {
    return args.zones.map(z => Number(z)).includes(state.zone);
  };
  app.homey.flow.getDeviceTriggerCard('alarm_presence_zone_x_false').registerRunListener(alarmPresenceZoneRunListener);
  app.homey.flow.getDeviceTriggerCard('alarm_presence_zone_x_true').registerRunListener(alarmPresenceZoneRunListener);
  app.homey.flow
    .getConditionCard('alarm_presence_zone_x_has')
    .registerRunListener((args: { zones: string[]; device: MultiZoneCapabilityDeviceInterface }) => {
      return args.zones.some(zone => args.device.isZoneOccupied(Number(zone)));
    });
}
