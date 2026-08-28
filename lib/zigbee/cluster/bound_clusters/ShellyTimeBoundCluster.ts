import type ManagerClock from 'homey/manager/clock.js';
import zbClusters, { type TimeClusterAttributes, type TimeClusterCommands } from 'zigbee-clusters';

export default class ShellyTimeBoundCluster extends zbClusters.BoundCluster<
  TimeClusterAttributes,
  TimeClusterCommands
> {
  public constructor(private clock: ManagerClock) {
    super();
  }

  public get time(): number {
    const utcNow = Math.floor(Date.now() / 1000);

    return utcNow - 946684800; // Seconds since 2000-01-01 00:00:00 UTC
  }

  public get localTime(): number {
    return this.time + this.timeZone;
  }

  public get timeZone(): number {
    const timezone = this.clock.getTimezone();
    const date = new Date();

    const tz = date
      .toLocaleString('en', {
        timeZone: timezone,
        timeStyle: 'long',
      })
      .split(' ')
      .slice(-1)[0];
    const dateString = date.toString();
    return Math.floor((Date.parse(`${dateString} UTC`) - Date.parse(`${dateString} ${tz}`)) / 1000);
  }

  public get dstStart(): number {
    return 0xffffffff; // DST start time (0xFFFFFFFF = not known/not used)
  }

  public get dstEnd(): number {
    return 0xffffffff; // DST end time (0xFFFFFFFF = not known/not used)
  }

  public get dstShift(): number {
    return 0; // DST shift in seconds (0 = no DST or not applicable)
  }
}
