import qs from 'qs';
import axios from 'axios';
import ApiClass from './apiClass';

const baseURL = import.meta.env.APP_APIHOST;
const instance = axios.create({ baseURL });

export const getMaterialTypes = () => instance.get('/api/material-types');

export const getMaterials = (data: any) => instance.get('/api/materials?' + data);

export const getMaterialsByType = (data: any) =>
  instance.get('/api/materials?' + qs.stringify(data));

export const getFontStyleTypes = () => instance.get('/api/font-style-types');

export const getFontStyles = (data: any) => instance.get('/api/font-styles?' + data);

export const getFontStyleListByType = (data: any) =>
  instance.get('/api/font-styles?' + qs.stringify(data));

export const commonMaterialsApi = new ApiClass('/api/materials');

export const commonMaterialsTypeApi = new ApiClass('/api/material-types');

export const commonFontGroupTypeApi = new ApiClass('/api/font-style-types');

export const commonFontGroupApi = new ApiClass('/api/font-styles');

export const commonFontApi = new ApiClass('/api/fonts');

export const commonFontStyleApi = new ApiClass('/api/fontborders');

export const commonSizeApi = new ApiClass('/api/sizes');
