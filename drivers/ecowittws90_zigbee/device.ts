import zbClusters, { type ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';
import initPowerConfigurationDevice from '@drenso/homey-zigbee-library/capabilities/powerConfiguration.mjs';
import initMeasureHumidityDevice from '@drenso/homey-zigbee-library/capabilities/measureHumidity.mjs';
import initMeasureTemperatureDevice from '@drenso/homey-zigbee-library/capabilities/measureTemperature.mjs';
import initMeasureIlluminanceDevice from '@drenso/homey-zigbee-library/capabilities/measureIlluminance.mjs';
import { initReadOnlyCapability } from '@drenso/homey-zigbee-library/lib/attributeDevice.mjs';
import ShellyCustomWindCluster from '../../lib/zigbee/cluster/ShellyCustomWindCluster.js';
import ShellyCustomUVCluster from '../../lib/zigbee/cluster/ShellyCustomUVCluster.js';
import ShellyCustomRainCluster from '../../lib/zigbee/cluster/ShellyCustomRainCluster.js';

export default class EcowittWS90ZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initPowerConfigurationDevice(this, zclNode);
    await initMeasureIlluminanceDevice(this, zclNode);
    await initMeasureTemperatureDevice(this, zclNode);
    await initMeasureHumidityDevice(this, zclNode);
    // measure_pressure
    await initReadOnlyCapability(
      this,
      zclNode,
      'measure_pressure',
      zbClusters.CLUSTER.PRESSURE_MEASUREMENT,
      'measuredValue',
      value => {
        if (value === 0x8000) {
          return null;
        }

        // From Homey-zigbeedriver
        // MeasuredValue represents the pressure in kPa as follows:
        // MeasuredValue = 10 x Pressure
        // However, as 1 kPa == 10 mbar, it only needs to be rounded
        return value;
      },
    );
    // measure_wind_strength
    await initReadOnlyCapability(
      this,
      zclNode,
      'measure_wind_strength',
      ShellyCustomWindCluster,
      'windSpeed',
      this.convertMStoKMH,
    );
    // measure_wind_angle
    await initReadOnlyCapability(
      this,
      zclNode,
      'measure_wind_angle',
      ShellyCustomWindCluster,
      'windDirection',
      this.scaleByTen,
    );
    // measure_gust_strength
    await initReadOnlyCapability(
      this,
      zclNode,
      'measure_gust_strength',
      ShellyCustomWindCluster,
      'gustSpeed',
      this.convertMStoKMH,
    );
    // measure_ultraviolet
    await initReadOnlyCapability(
      this,
      zclNode,
      'measure_ultraviolet',
      ShellyCustomUVCluster,
      'uvIndex',
      this.scaleByTen,
    );
    // alarm_rain
    await initReadOnlyCapability(this, zclNode, 'alarm_rain', ShellyCustomRainCluster, 'rainStatus');
    // measure_rain
    await initReadOnlyCapability(
      this,
      zclNode,
      'measure_rain',
      ShellyCustomRainCluster,
      'precipitation',
      this.scaleByTen,
    );
  }

  protected convertMStoKMH(ms: number): number {
    return Math.round(ms * 3.6) / 10; // Scaling by factor 10 implicitly done
  }

  protected scaleByTen(value: number): number {
    return value / 10;
  }
}
