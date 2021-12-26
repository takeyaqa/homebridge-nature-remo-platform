import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { NatureRemoPlatform } from './platform';

const UPDATE_INTERVAL = 1000 * 60 * 5;

export class NatureNemoSensorAccessory {
  private readonly tempertureSensorservice?: Service;
  private readonly humiditySensorservice?: Service;
  private readonly lightSensorservice?: Service;
  private readonly name: string;
  private readonly id: string;

  constructor(
    private readonly platform: NatureRemoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.category = this.platform.api.hap.Categories.SENSOR;

    const [model, version] = this.accessory.context.device.firmware_version.split('/');
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nature')
      .setCharacteristic(this.platform.Characteristic.Model, model || '')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.serial_number)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, version || '')
      .setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    if (this.accessory.context.device.newest_events.te) {
      this.tempertureSensorservice
      = this.accessory.getService(this.platform.Service.TemperatureSensor)
        || this.accessory.addService(this.platform.Service.TemperatureSensor);
      this.tempertureSensorservice.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
        .onGet(this.getCurrentTemperature.bind(this));
    }

    if (this.accessory.context.device.newest_events.hu) {
      this.humiditySensorservice
        = this.accessory.getService(this.platform.Service.HumiditySensor)
          || this.accessory.addService(this.platform.Service.HumiditySensor);
      this.humiditySensorservice.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .onGet(this.getCurrentHumidity.bind(this));
    }

    if (this.accessory.context.device.newest_events.il) {
      this.lightSensorservice
        = this.accessory.getService(this.platform.Service.LightSensor)
          || this.accessory.addService(this.platform.Service.LightSensor);
      this.lightSensorservice.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
        .onGet(this.getCurrentLightLevel.bind(this));
    }

    this.platform.logger.debug('[%s] id -> %s', this.accessory.context.device.name, this.accessory.context.device.id);
    this.name = this.accessory.context.device.name;
    this.id = this.accessory.context.device.id;

    setInterval(async () => {
      this.platform.logger.info('[%s] Update sensor values', this.name);
      try {
        const sensorValue = await this.platform.natureRemoApi.getSensorValue(this.id);
        if (sensorValue.te) {
          this.platform.logger.info('[%s] Current Temperature -> %s', this.name, sensorValue.te);
          this.tempertureSensorservice?.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, sensorValue.te);
        }
        if (sensorValue.hu) {
          this.platform.logger.info('[%s] Current Humidity -> %s', this.name, sensorValue.hu);
          this.humiditySensorservice?.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, sensorValue.hu);
        }
        if (sensorValue.il) {
          this.platform.logger.info('[%s] Current Light Level -> %s', this.name, sensorValue.il);
          this.lightSensorservice?.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, sensorValue.il);
        }
      } catch (err) {
        if (err instanceof Error) {
          this.platform.logger.error(err.message);
        }
      }
    }, UPDATE_INTERVAL);
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getCurrentTemperature called');
    try {
      const sensorValue = await this.platform.natureRemoApi.getSensorValue(this.id);
      this.platform.logger.info('[%s] Current Temperature -> %s', this.name, sensorValue.te);
      if (sensorValue.te) {
        return sensorValue.te;
      } else {
        throw new Error('cannnot get sensor value');
      }
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  async getCurrentHumidity(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getCurrentHumidity called');
    try {
      const sensorValue = await this.platform.natureRemoApi.getSensorValue(this.id);
      this.platform.logger.info('[%s] Current Humidity -> %s', this.name, sensorValue.hu);
      if (sensorValue.hu) {
        return sensorValue.hu;
      } else {
        throw new Error('cannnot get sensor value');
      }
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }

  async getCurrentLightLevel(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getCurrentLightLevel called');
    try {
      const sensorValue = await this.platform.natureRemoApi.getSensorValue(this.id);
      this.platform.logger.info('[%s] Current Light Level -> %s', this.name, sensorValue.il);
      if (sensorValue.il) {
        return sensorValue.il;
      } else {
        throw new Error('cannnot get sensor value');
      }
    } catch (err) {
      if (err instanceof Error) {
        this.platform.logger.error(err.message);
      }
      throw err;
    }
  }
}
