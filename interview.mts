import HttpChannel from './lib/rpc/channel/HttpChannel.mjs';
import Shelly from './lib/component/components/Shelly.mjs';
import path from 'node:path';
import * as fs from 'node:fs';

// Relative to project root
const interviewsDir = '/interviews';

const address = process.argv[2];
// TODO add password
const rpcChannel = new HttpChannel(address, console.log);

const deviceInfo = await Shelly.GetDeviceInfo(rpcChannel);
const deviceType = deviceInfo.result.id.split('-')[0];

console.log(`Interviewing ${deviceType}...`);
const components = await Shelly.getAllComponents(rpcChannel);

const outputDir = path.join(import.meta.dirname, interviewsDir, deviceType);
const outputPath = path.join(outputDir, 'rpc.json');

await fs.promises.mkdir(outputDir, { recursive: true });
await fs.promises.writeFile(outputPath, JSON.stringify(components, undefined, 2));

console.log(`Result written to ${outputPath}`);
