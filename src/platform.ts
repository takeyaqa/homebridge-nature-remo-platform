import {
  API,
  APIEvent,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { NatureRemoApi } from './natureRemoApi';
import { NatureNemoLightAccessory } from './lightAccessory';
import { NatureNemoAirConAccessory } from './airConAccessory';
import { NatureNemoTvAccessory } from './tvAccessory';
import { NatureNemoSensorAccessory } from './sensorAccessory';

export class NatureRemoPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public readonly natureRemoApi: NatureRemoApi;

  constructor(
    public readonly logger: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.logger.debug('accessToken ->', this.config.accessToken);
    this.natureRemoApi = new NatureRemoApi(this.config.accessToken as string);
    this.logger.debug('Finished initializing platform:', this.config.name);

    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      logger.debug('Executed didFinishLaunching callback');
      this.discoverDevices().then(() => {
        logger.info('Completed discover accessories');
      }).catch((err) => {
        logger.error(err.message);
        throw err;
      });
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.logger.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices(): Promise<void> {
    const devices = await this.natureRemoApi.getAllDevices();
    for (const device of devices) {
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === device.id);
      if (existingAccessory) {
        this.logger.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new NatureNemoSensorAccessory(this, existingAccessory);
      } else {
        if (device.newest_events.te) {
          this.logger.info('Adding new accessory: %s (%s)', device.name, device.firmware_version);
          const accessory = new this.api.platformAccessory(device.name, device.id);
          accessory.context = { device: device };
          new NatureNemoSensorAccessory(this, accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        } else {
          this.logger.info('%s (%s) has no sensor. skip.', device.name, device.firmware_version);
        }
      }
    }
    const appliances = await this.natureRemoApi.getAllAppliances();
    for (const appliance of appliances) {
      if (appliance.type === 'LIGHT' || appliance.type === 'AC' || appliance.type === 'TV') {
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === appliance.id);
        if (existingAccessory) {
          this.logger.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          if (appliance.type === 'LIGHT') {
            new NatureNemoLightAccessory(this, existingAccessory);
          } else if (appliance.type === 'AC') {
            new NatureNemoAirConAccessory(this, existingAccessory);
          } else if (appliance.type === 'TV') {
            new NatureNemoTvAccessory(this, existingAccessory);
          }
        } else {
          this.logger.info('Adding new accessory:', appliance.nickname);
          const accessory = new this.api.platformAccessory(appliance.nickname, appliance.id);
          accessory.context = { appliance: appliance };
          if (appliance.type === 'LIGHT') {
            new NatureNemoLightAccessory(this, accessory);
          } else if (appliance.type === 'AC') {
            new NatureNemoAirConAccessory(this, accessory);
          } else if (appliance.type === 'TV') {
            new NatureNemoTvAccessory(this, accessory);
          }
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }
  }
}
