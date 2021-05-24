const fs = require('fs');
const path = require('path');
const xlsx = require('node-xlsx');
const { getProjectConfig, getLangDir } = require('../../utils/config');
const { getLangData } = require('../extract/getLangData');

const CONFIG = getProjectConfig();
const COL_CONFIG = CONFIG.exportColConfig;
const COL_INDEX_MAP = CONFIG.exportColIndexMap;

const COL_WIDTH_MAP = {
  businessLine: { wch: 20 },
  key: { wch: 20 },
  text: { wch: 30 },
};

const EXPORT_TYPE = {
  UNTRANSLATED: '0',
  ALL: '2',
};

function getTexts(srcLangDir, distLangDir, businessLine, isAll) {
  const result = [];
  const allFiles = fs.readdirSync(srcLangDir);

  const files = allFiles
    .filter((file) => file.endsWith('.js') && file !== 'index.js')
    .map((file) => file);
  files.forEach((file) => {
    const srcFile = path.resolve(srcLangDir, file);
    const srcLangObj = getLangData(srcFile);
    if (isAll) {
      const distFile = path.resolve(distLangDir, file);
      const distLangObj = getLangData(distFile);
      result.push({
        name: file,
        data: Object.keys(srcLangObj).map((key) => ({
          key,
          text: srcLangObj[key],
          translatedText: distLangObj[key],
          businessLine,
        })),
      });
    } else {
      if (!distLangDir) {
        result.push({
          name: file,
          data: Object.keys(srcLangObj).map((key) => ({
            key,
            text: srcLangObj[key],
            businessLine,
          })),
        });
      } else {
        const distFile = path.resolve(distLangDir, file);
        const distLangObj = getLangData(distFile);
        if (
          Object.keys(srcLangObj).length !== Object.keys(distLangObj).length
        ) {
          const data = [];
          Object.keys(srcLangObj).forEach((key) => {
            if (!distLangObj.hasOwnProperty(key)) {
              data.push({ key, text: srcLangObj[key], businessLine });
            }
          });
          result.push({ name: file, data });
        }
      }
    }
  });

  return result;
}

function getTargetFiles(distLang, businessLine, isAll) {
  const srcLangDir = getLangDir(CONFIG.srcLang);
  const distLangDir = getLangDir(distLang);

  if (!fs.existsSync(distLangDir)) {
    return getTexts(srcLangDir, false, businessLine, isAll);
  }

  return getTexts(srcLangDir, distLangDir, businessLine, isAll);
}

function createXlsx(files, distLang, isAll) {
  let colConfig = [...COL_CONFIG];
  let colIndexMap = { ...COL_INDEX_MAP };
  let colWidthMap = { ...COL_WIDTH_MAP };
  if (isAll) {
    colConfig = [...COL_CONFIG, distLang];
    colIndexMap = { ...COL_INDEX_MAP, translatedText: COL_INDEX_MAP.text + 1 };
    colWidthMap = { ...COL_WIDTH_MAP, translatedText: { wch: 40 } };
  }
  const sheets = files.map(({ name, data }) => {
    const sheetData = data.map((rowData) => {
      const row = new Array(colConfig.length).fill('');
      Object.keys(colIndexMap).forEach((key) => {
        row.splice(colIndexMap[key], 1, rowData[key]);
      });
      return row;
    });
    sheetData.unshift(colConfig);
    return { name, data: sheetData };
  });

  const colWidth = new Array(colConfig.length).fill({ wch: 10 });
  Object.keys(colIndexMap).forEach((key) => {
    colWidth.splice(colIndexMap[key], 1, colWidthMap[key]);
  });
  const options = {
    '!cols': colWidth,
  };

  return xlsx.build(sheets, options);
}

async function exportLang(distLang, range, businessLine, outputFilename) {
  const langs = distLang ? [distLang] : CONFIG.distLangs;
  const isAll = range === EXPORT_TYPE.ALL;

  langs.forEach((lang) => {
    const targetFiles = getTargetFiles(lang, businessLine, isAll);

    if (targetFiles.length === 0) {
      console.log(`${lang} 没有未翻译的文案了`);
      return;
    }

    const xlsxContent = createXlsx(targetFiles, distLang, isAll);
    let rangeText = '待翻译';
    if (isAll) {
      rangeText = '全量';
    }
    const outputFile =
      outputFilename || `./${businessLine || ''}${rangeText}语料-${lang}`;
    fs.writeFileSync(`${outputFile}.xlsx`, xlsxContent);
    console.log(`已导出 ${outputFile}`);
  });
}

module.exports = { exportLang };
