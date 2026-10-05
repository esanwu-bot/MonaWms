/**
 * 扫码服务：@nativescript/camera 拍照 → ImageSource → multipart 上传
 * 后端识别接口：POST /api/barcode/recognize（multipart 字段 barcode_image，jpg/png ≤5MB）
 * 演示模式：弹窗手动录入条码（等价于识别结果）
 */
import { takePicture, requestPermissions } from '@nativescript/camera';
import { ImageSource, Http, knownFolders, prompt, inputType } from '@nativescript/core';
import { store } from './store';

/** 拍照并落盘为临时 JPEG，返回文件路径 */
export async function captureBarcodeImage() {
  const granted = await requestPermissions();
  const camOk = granted && (granted.camera === undefined || granted.camera);
  if (camOk === false) throw new Error('相机权限被拒绝');

  const asset = await takePicture({
    width: 720,
    height: 960,
    keepAspectRatio: true,
    saveToPictureLibrary: false,
  });
  const img = await ImageSource.fromAsset(asset);
  if (!img) throw new Error('读取拍照结果失败');
  const file = knownFolders.temp().getFile('barcode-' + Date.now() + '.jpg');
  const ok = img.saveToFile(file.path, 'jpeg', 85);
  if (!ok) throw new Error('保存抓拍图片失败');
  return file.path;
}

/** 上传至 backend_tp6 /barcode/recognize，返回识别出的码串 */
export async function recognizeBarcode(filePath) {
  let fileData;
  if (global.isAndroid) {
    fileData = new java.io.File(filePath);
  } else {
    fileData = NSData.dataWithContentsOfFile(filePath);
  }
  const headers = {};
  if (store.token) headers.Authorization = 'Bearer ' + store.token;

  const res = await Http.request({
    url: store.baseUrl.replace(/\/+$/, '') + '/barcode/recognize',
    method: 'POST',
    headers,
    multipartParams: {
      barcode_image: {
        name: 'barcode_image',
        filename: 'barcode.jpg',
        contentType: 'image/jpeg',
        data: fileData,
      },
    },
    timeout: 30000,
  });

  let json = null;
  try {
    json = JSON.parse(res.content.toString() || '{}');
  } catch (e) {
    throw new Error('识别响应解析失败');
  }
  if (!json || json.code !== 200 || !json.data || !json.data.barcode) {
    throw new Error((json && json.message) || '未能识别到有效条码');
  }
  return json.data.barcode;
}

/**
 * 一站式扫码，返回码串
 * @param {string[]} manualPool 演示模式下的候选 SN（用于默认值）
 */
export async function scanCode(manualPool = []) {
  if (store.demoMode) {
    const def = manualPool.length ? manualPool[Math.floor(Math.random() * manualPool.length)] : '';
    const r = await prompt({
      title: '扫码（演示模式）',
      message: '演示模式不启用相机，请手动输入条码 / 序列号',
      inputType: inputType.text,
      okButtonText: '确认',
      cancelButtonText: '取消',
      defaultText: def,
    });
    if (!r.result || !String(r.text || '').trim()) {
      const e = new Error('已取消');
      e.cancelled = true;
      throw e;
    }
    return String(r.text).trim();
  }

  const path = await captureBarcodeImage();
  return recognizeBarcode(path);
}
