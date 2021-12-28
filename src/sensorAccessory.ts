import { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import { NatureRemoPlatform } from './platform';
import { UPDATE_INTERVAL } from './settings';

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
    this.name = this.accessory.context.device.name;
    this.id = this.accessory.context.device.id;

    this.accessory.category = this.platform.api.hap.Categories.SENSOR;

    const [model, version] = this.accessory.context.device.firmware_version.split('/');
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Nature')
      .setCharacteristic(this.platform.Characteristic.Model, model || '')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.serial_number)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, version || '')
      .setCharacteristic(this.platform.Characteristic.Name, this.name);

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

    this.platform.logger.debug('[%s] id -> %s', this.name, this.id);

    setInterval(async () => {
      this.platform.logger.info('[%s] Update sensor values', this.name);
      const device = await this.platform.natureRemoApi.getDevice(this.id);
      if (device.newest_events.te) {
        const teVal = device.newest_events.te.val;
        this.platform.logger.info('[%s] Current Temperature -> %s', this.name, teVal);
        this.tempertureSensorservice?.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, teVal);
      }
      if (device.newest_events.hu) {
        const huVal = device.newest_events.hu.val;
        this.platform.logger.info('[%s] Current Humidity -> %s', this.name, huVal);
        this.humiditySensorservice?.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, huVal);
      }
      if (device.newest_events.il) {
        const ilVal = device.newest_events.il.val >= 0.0001 ? device.newest_events.il.val : 0.0001;
        this.platform.logger.info('[%s] Current Light Level -> %s', this.name, ilVal);
        this.lightSensorservice?.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, ilVal);
      }
    }, UPDATE_INTERVAL);
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getCurrentTemperature called');
    const device = await this.platform.natureRemoApi.getDevice(this.id);
    if (device.newest_events.te) {
      this.platform.logger.info('[%s] Current Temperature -> %s', this.name, device.newest_events.te.val);
      return device.newest_events.te.val;
    } else {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
    }
  }

  async getCurrentHumidity(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getCurrentHumidity called');
    const device = await this.platform.natureRemoApi.getDevice(this.id);
    if (device.newest_events.hu) {
      this.platform.logger.info('[%s] Current Humidity -> %s', this.name, device.newest_events.hu.val);
      return device.newest_events.hu.val;
    } else {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
    }
  }

  async getCurrentLightLevel(): Promise<CharacteristicValue> {
    this.platform.logger.debug('getCurrentLightLevel called');
    const device = await this.platform.natureRemoApi.getDevice(this.id);
    if (device.newest_events.il) {
      const ilVal = device.newest_events.il.val >= 0.0001 ? device.newest_events.il.val : 0.0001;
      this.platform.logger.info('[%s] Current Light Level -> %s', this.name, ilVal);
      return ilVal;
    } else {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.RESOURCE_DOES_NOT_EXIST);
    }
  }
}
