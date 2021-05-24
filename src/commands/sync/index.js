const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const {
  getProjectConfig,
  getLangDir,
  getVicsDir,
} = require('../../utils/config');
const { getLangData } = require('../extract/getLangData');
const { translateTexts } = require('../../utils/translate');
const { prettierFile } = require('../../utils/common');

const CONFIG = getProjectConfig();

async function getToLangObj(file, toLang) {
  const srcLangDir = getLangDir(CONFIG.srcLang);
  const distLangDir = getLangDir(toLang);
  const srcFile = path.resolve(srcLangDir, file);
  const distFile = path.resolve(distLangDir, file);
  const srcLangObj = getLangData(srcFile);
  let resultObj = {};
  let distLangObj;
  let targetKeys = [];
  let targetTexts = [];
  if (fs.existsSync(distFile)) {
    distLangObj = getLangData(distFile);
    if (Object.keys(srcLangObj).length === Object.keys(distLangObj).length) {
      return false;
    }
  }

  if (distLangObj) {
    resultObj = { ...distLangObj };
    Object.keys(srcLangObj).forEach((key) => {
      if (!distLangObj.hasOwnProperty(key)) {
        targetKeys.push(key);
        targetTexts.push(srcLangObj[key]);
      }
    });
  } else {
    targetKeys = [...Object.keys(srcLangObj)];
    targetTexts = [...Object.values(srcLangObj)];
  }

  if (targetTexts) {
    const translatedTexts = await translateTexts(targetTexts, toLang);

    targetKeys.forEach((key, index) => {
      _.set(resultObj, key, translatedTexts[index]);
    });

    return resultObj;
  }

  return false;
}

function writeToLangFile(file, toLang, toLangObj) {
  const fileContent = prettierFile(
    'export default ' + JSON.stringify(toLangObj, null, 2)
  );
  const filePath = path.resolve(getLangDir(toLang), path.basename(file));

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, fileContent, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function translateFile(file, toLang) {
  const toLangObj = await getToLangObj(file, toLang);
  const vicsDir = getVicsDir();
  const toLangDir = path.resolve(vicsDir, toLang);
  if (!fs.existsSync(toLangDir)) {
    fs.mkdirSync(toLangDir);
  }

  if (toLangObj) {
    await writeToLangFile(file, toLang, toLangObj);
  }
}

function sync(callback) {
  if (!CONFIG.baiduAppid) {
    console.log('请配置 baiduAppid');
    return;
  }

  const srcLangDir = getLangDir(CONFIG.srcLang);
  const allFiles = fs.readdirSync(srcLangDir);
  const files = allFiles
    .filter((file) => file.endsWith('.js') && file !== 'index.js')
    .map((file) => file);
  const translateFiles = (toLang) =>
    files.map((file) => {
      translateFile(file, toLang);
    });
  Promise.all(CONFIG.distLangs.map(translateFiles)).then(
    () => {
      const langDirs = CONFIG.distLangs.map(getLangDir);
      langDirs.map((dir) => {
        const filePath = path.resolve(dir, 'index.js');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
        fs.copyFileSync(path.resolve(srcLangDir, 'index.js'), filePath);
      });
      callback && callback();
    },
    (e) => {
      console.error(e);
      process.exit(1);
    }
  );
}

module.exports = { sync };
