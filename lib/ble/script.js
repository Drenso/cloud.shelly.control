/* eslint-disable */
function homey_ble_forward_script_version() {
  return 0;
}

/**
 * @typedef ScanResult
 * @property {string} addr - Device MAC address
 * @property {number} addr_type - Address type
 * @property {string} advData - Advertisement data
 * @property {string} scanRsp - Scan response (active scans)
 * @property {number} rssi - Signal strength
 * @property {number} flags - Advertisement flags
 * @property {string=} local_name - Device name
 * @property {Record<string, string>=} manufacturer_data - Manufacturer-specific data
 * @property {unknown[]=} service_uuids - Advertised service UUIDs
 * @property {Record<string, string>} service_data - Service-specific data
 * @property {number=} tx_power_level - Transmit power
 */

const ALTERCO_MANUFACTURER_ID = '0ba9';

const scannerOptions = {
  duration_ms: -1,
  active: true,
};

/**
 * @param result {ScanResult}
 */
function forward(result) {
  const encodedServiceData = {};

  for (service in result.service_data) {
    encodedServiceData[service] = btoa(result.service_data[service]);
  }

  result.advData = btoa(result.advData);
  result.service_data = encodedServiceData;
  result.scanRsp = btoa(result.scanRsp);

  if (result.manufacturer_data !== undefined) {
    const encodedManufacturerData = {};

    for (const manufacturer in result.manufacturer_data) {
      encodedManufacturerData[manufacturer] = btoa(result.manufacturer_data[manufacturer]);
    }

    result.manufacturer_data = encodedManufacturerData;
  }

  Shelly.emitEvent('ble_forward', result);
}

/**
 * @param event
 * @param result {ScanResult}
 */
function callback(event, result) {
  switch (event) {
    case BLE.Scanner.SCAN_START:
      console.log('Scan started');
      break;
    case BLE.Scanner.SCAN_STOP:
      console.log('Scan stopped');
      break;
    case BLE.Scanner.SCAN_RESULT:
      if (result.manufacturer_data === undefined) {
        return;
      }
      for (const manufacturer in result.manufacturer_data) {
        if (manufacturer === ALTERCO_MANUFACTURER_ID) {
          forward(result);
        }
      }
      break;
  }
}

function init() {
  if (BLE.Scanner === undefined) {
    throw new Error('Error: Bluetooth does not work in Zigbee mode');
  }

  // get the config of ble component
  const BLEConfig = Shelly.getComponentConfig('ble');
  if (!BLEConfig.enable) {
    throw new Error('Error: Bluetooth is not enabled, please enable it from settings');
  }

  BLE.Scanner.Start(scannerOptions, callback);
}

init();
