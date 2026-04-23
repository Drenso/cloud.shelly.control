import Homey from 'homey';

let lastLoggedIp = '';

export async function getIp(homey: typeof Homey.App.prototype.homey): Promise<string> {
  let ip;
  if (Homey.env.HOMEY_IP) {
    ip = Homey.env.HOMEY_IP;
  } else {
    ip = await homey.cloud.getLocalAddress();
    // Homey adds a port, so remove that
    const lastColon = ip.lastIndexOf(':');
    if (lastColon !== -1) {
      ip = ip.substring(0, lastColon);
    }
  }

  if (lastLoggedIp !== ip) {
    (homey.app as Homey.App).log('Using local IP', ip);
    lastLoggedIp = ip;
  }

  return ip;
}
