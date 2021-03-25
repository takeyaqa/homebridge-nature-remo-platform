import {
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { NatureRemoPlatform } from './platform';

const UPDATE_INTERVAL = 1000 * 60 * 5;

export class NatureNemoSensorAccessory {
  private readonly service: Service;
  private readonly name: string;
  private readonly id: string;
  
  constructor(
    private readonly platform: NatureRemoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nature Inc.')
      .setCharacteristic(this.platform.Characteristic.Model, 'Nature Remo series')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'S-e-r-i-a-l');

    this.service
      = this.accessory.getService(this.platform.Service.TemperatureSensor)
        || this.accessory.addService(this.platform.Service.TemperatureSensor);
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .on(CharacteristicEventTypes.GET, this.getCurrentTemperature.bind(this));

    // Remo-mini does not have humidity and light sensors
    if (!accessory.context.device.firmware_version.startsWith('Remo-mini')) {
      this.service
        = this.accessory.getService(this.platform.Service.HumiditySensor)
          || this.accessory.addService(this.platform.Service.HumiditySensor);
      this.service.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .on(CharacteristicEventTypes.GET, this.getCurrentHumidity.bind(this));

      this.service
        = this.accessory.getService(this.platform.Service.LightSensor)
          || this.accessory.addService(this.platform.Service.LightSensor);
      this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
        .on(CharacteristicEventTypes.GET, this.getCurrentLightLevel.bind(this));
    }

    this.platform.logger.debug('[%s] id -> %s', accessory.context.device.name, accessory.context.device.id);
    this.name = accessory.context.device.name;
    this.id = accessory.context.device.id;
  
    setInterval(() => {
      this.platform.logger.info('[%s] Update sensor values', this.name);      
      this.platform.natureRemoApi.getSensorValue(this.id).then((sensorValue) => {
        this.platform.logger.info('[%s] Current Temperature -> %s', this.name, sensorValue.te);
        this.platform.logger.info('[%s] Current Humidity -> %s', this.name, sensorValue.hu);
        this.platform.logger.info('[%s] Current Light Level -> %s', this.name, sensorValue.il);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, sensorValue.te);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, sensorValue.hu);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, sensorValue.il); 
      }).catch((err) => {
        this.platform.logger.error(err.message);
      });
    }, UPDATE_INTERVAL);
  }

  getCurrentTemperature(callback: CharacteristicGetCallback): void {
    this.platform.logger.debug('getCurrentTemperature called');
    this.platform.natureRemoApi.getSensorValue(this.id).then((sensorValue) => {
      this.platform.logger.info('[%s] Current Temperature -> %s', this.name, sensorValue.te);
      callback(null, sensorValue.te);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }

  getCurrentHumidity(callback: CharacteristicGetCallback): void {
    this.platform.logger.debug('getCurrentHumidity called');
    this.platform.natureRemoApi.getSensorValue(this.id).then((sensorValue) => {
      this.platform.logger.info('[%s] Current Humidity -> %s', this.name, sensorValue.hu);
      callback(null, sensorValue.hu);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }

  getCurrentLightLevel(callback: CharacteristicGetCallback): void {
    this.platform.logger.debug('getCurrentLightLevel called');
    this.platform.natureRemoApi.getSensorValue(this.id).then((sensorValue) => {
      this.platform.logger.info('[%s] Current Light Level -> %s', this.name, sensorValue.il);
      callback(null, sensorValue.il);
    }).catch((err) => {
      this.platform.logger.error(err.message);
      callback(err);
    });
  }
}
