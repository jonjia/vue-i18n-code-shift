const fs = require('fs');
const path = require('path');
const xlsx = require('node-xlsx');
const { getProjectConfig, getLangDir } = require('../../utils/config');
const { getLangData } = require('../extract/getLangData');

const CONFIG = getProjectConfig();
const COL_INDEX_MAP = CONFIG.checkColIndexMap;

function getTranslatedLocale(filePath, langs) {
  const langContent = xlsx.parse(filePath);
  if (langContent.every((sheet) => sheet.data.length <= 1)) {
    console.log('没有找到要导入的语料');
    return false;
  }
  const locales = {};
  for (let i = 0; i < langs.length; i++) {
    locales[langs[i]] = {};
  }
  const firstSheetData = langContent[0].data;
  const firstKey = firstSheetData[1][COL_INDEX_MAP.key];
  const isNestedKey = firstKey.includes('.');
  if (isNestedKey) {
    for (let i = 1; i < firstSheetData.length; i++) {
      const line = firstSheetData[i];
      const [, filename, keyName] = line[COL_INDEX_MAP.key].split('.');
      for (let i = 0; i < langs.length; i++) {
        const lang = langs[i];
        if (!locales[lang][filename]) {
          locales[lang][filename] = {};
        }
        locales[lang][filename][keyName] = line[COL_INDEX_MAP[lang]];
      }
    }
  } else {
    langContent.forEach(({ name, data }) => {
      const [filename] = name.split('.');
      for (let i = 1; i < data.length; i++) {
        const line = data[i];
        const keyName = line[COL_INDEX_MAP.key];
        for (let i = 0; i < langs.length; i++) {
          const lang = langs[i];
          if (!locales[lang][filename]) {
            locales[lang][filename] = {};
          }
          locales[lang][filename][keyName] = line[COL_INDEX_MAP[lang]];
        }
      }
    });
  }
  return locales;
}

function getSourceLocale(langs) {
  const locales = {};
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];
    if (!locales[lang]) {
      locales[lang] = {};
    }
    const langDir = getLangDir(lang);
    const allFiles = fs.readdirSync(langDir);
    const files = allFiles.filter(
      (file) => file.endsWith('.js') && file !== 'index.js'
    );
    files.forEach((file) => {
      const [filename] = file.split('.');
      const filePath = path.resolve(langDir, file);
      const langObj = getLangData(filePath);
      locales[lang][filename] = langObj;
    });
  }
  return locales;
}

function checkLocale(filePath, langs) {
  const translatedLocale = getTranslatedLocale(filePath, langs);
  const sourceLocale = getSourceLocale(langs);
  const checkResult = {};
  if (translatedLocale && sourceLocale) {
    for (let i = 0; i < langs.length; i++) {
      const lang = langs[i];
      if (!checkResult[lang]) {
        checkResult[lang] = {};
      }
      const langResult = checkResult[lang];
      const translated = translatedLocale[lang];
      const source = sourceLocale[lang];
      const translatedFiles = Object.keys(translated);
      const sourceFiles = Object.keys(source);
      if (translatedFiles.length !== sourceFiles.length) {
        langResult.fileDiff = {
          translated: [],
          source: [],
        };
        sourceFiles.forEach((file) => {
          if (!translated[file]) {
            langResult.fileDiff.source.push(file);
          }
        });
        translatedFiles.forEach((file) => {
          if (!source[file]) {
            langResult.fileDiff.translated.push(file);
          }
        });
      }

      sourceFiles.forEach((file) => {
        langResult[file] = [];
        const translatedContent = translated[file];
        const sourceContent = source[file];
        const keys = Object.keys(sourceContent);
        if (translatedContent) {
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const translatedValue = translatedContent[key];
            const sourceValue = sourceContent[key];
            if (formatValue(sourceValue) === formatValue(translatedValue)) {
              continue;
            } else {
              langResult[file].push({
                key,
                translated: translatedValue || '',
                source: sourceValue || '',
              });
            }
          }
        }
      });
    }
  }

  return checkResult;
}

function formatValue(value) {
  return value ? value.trim().replace("'", "'").replace('"', '"') : '';
}

function createResult(checkResult) {
  const htmlTemplate = fs.readFileSync(
    path.resolve(__dirname, './template.html'),
    'utf-8'
  );
  const resultJson = JSON.stringify(checkResult, null, 2);
  fs.writeFileSync('./语料对比结果.json', resultJson);
  fs.writeFileSync(
    './语料对比报告.html',
    htmlTemplate.replace('RESULT', resultJson)
  );
}

function check(filePath) {
  const langs = [CONFIG.srcLang, ...CONFIG.distLangs];
  // 1. 语料对比
  if (!fs.existsSync(filePath)) {
    console.log(`${filePath} 要对比的语料文件不存在，请先确认文件路径`);
    return false;
  }
  const checkResult = checkLocale(filePath, langs);
  createResult(checkResult);
  // 2. 校验语料缺失
  // 3. 校验未使用语料
}

module.exports = { check };
