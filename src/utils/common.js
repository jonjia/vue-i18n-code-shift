const prettier = require('prettier');
const { PROJECT_CONFIG } = require('../constants');
const { getProjectConfig } = require('./config');

const CONFIG = getProjectConfig();

function findMatchKey(langObj, text) {
  for (const key in langObj) {
    if (langObj[key] === text) {
      return key;
    }
  }
  return null;
}

function findMatchValue(langObj, key) {
  return langObj[key];
}

function formatText(text) {
  return text
    .replace(/\\n/g, '')
    .replace(/\s*/g, '')
    .replace(/{{/, '')
    .replace(/}}/, '')
    .replace(/'/g, '')
    .replace(/"/g, '');
}

function prettierFile(fileContent) {
  try {
    return prettier.format(fileContent, {
      ...PROJECT_CONFIG.prettierConfig,
      ...CONFIG.prettierConfig,
    });
  } catch (e) {
    console.error(`代码格式化报错！${e.toString()}\n代码为：${fileContent}`);
    return fileContent;
  }
}

module.exports = {
  findMatchKey,
  findMatchValue,
  formatText,
  prettierFile,
};
