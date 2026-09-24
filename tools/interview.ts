/**
 * Get information about the RPC components of a device,
 * with its IP address passed as argument.
 */
import HttpChannel from '../lib/rpc/channel/HttpChannel.js';
import Shelly from '../lib/component/components/Shelly.js';
import path from 'node:path';
import * as fs from 'node:fs';
import { basename } from 'path';

let interviewsDir = 'interviews';
if (basename(import.meta.dirname) === 'tools') {
  interviewsDir = '../interviews';
}

const address = process.argv[2];
if (!address) {
  console.error('Please provide an IP address as argument'); // eslint-disable-line no-restricted-syntax -- Allowed for local tools
  process.exit(1);
}

const mockTranslate = (key: string): string => key;

const rpcChannel = new HttpChannel(address, console.log, mockTranslate, false, null);

const deviceInfo = await Shelly.GetDeviceInfo(rpcChannel);
const deviceType = deviceInfo.result.id.split('-')[0];

console.log(`Interviewing ${deviceType}...`); // eslint-disable-line no-restricted-syntax -- Allowed for local tools
const components = (await Shelly.getAllComponents(rpcChannel)).sort((a, b) => a.key.localeCompare(b.key));

const outputDir = path.join(import.meta.dirname, interviewsDir, deviceType);
const outputPath = path.join(outputDir, 'rpc.json');

await fs.promises.mkdir(outputDir, { recursive: true });
await fs.promises.writeFile(outputPath, JSON.stringify(components, undefined, 2));

console.log(`Result written to ${outputPath}`); // eslint-disable-line no-restricted-syntax -- Allowed for local tools
