/**
 * Get information about the RPC components of a device,
 * with its IP address passed as argument.
 */
import HttpChannel from './lib/rpc/channel/HttpChannel.mjs';
import Shelly from './lib/component/components/Shelly.mjs';
import path from 'node:path';
import * as fs from 'node:fs';

// Relative to project root
const interviewsDir = '/interviews';

const address = process.argv[2];

const mockTranslate = (key: string): string => key;

// TODO add password
const rpcChannel = new HttpChannel(address, console.log, mockTranslate);

const deviceInfo = await Shelly.GetDeviceInfo(rpcChannel);
const deviceType = deviceInfo.result.id.split('-')[0];

console.log(`Interviewing ${deviceType}...`);
const components = (await Shelly.getAllComponents(rpcChannel)).sort((a, b) => a.key.localeCompare(b.key));

const outputDir = path.join(import.meta.dirname, interviewsDir, deviceType);
const outputPath = path.join(outputDir, 'rpc.json');

await fs.promises.mkdir(outputDir, { recursive: true });
await fs.promises.writeFile(outputPath, JSON.stringify(components, undefined, 2));

console.log(`Result written to ${outputPath}`);
