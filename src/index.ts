import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { NatureRemoPlatform } from './platform'; 

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, NatureRemoPlatform);
};
