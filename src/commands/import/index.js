const fs = require('fs');
const path = require('path');
const xlsx = require('node-xlsx');
const { getProjectConfig } = require('../../utils/config');
const { getLangData } = require('../extract/getLangData');
const { prettierFile } = require('../../utils/common');

const CONFIG = getProjectConfig();
const COL_INDEX_MAP = CONFIG.importColIndexMap;

function updateLangFile(langContent, lang) {
  const langDir = `${CONFIG.vicsDir}/${CONFIG.langMap[lang]}`;

  langContent.forEach(({ name, data }) => {
    const filePath = path.resolve(langDir, name);
    const langObj = getLangData(filePath);
    const newLangObj = { ...langObj };
    data.slice(1).forEach((row) => {
      newLangObj[row[COL_INDEX_MAP.key]] = row[COL_INDEX_MAP.text];
    });
    const newContent = prettierFile(
      `export default ${JSON.stringify(newLangObj, null, 2)}`
    );
    fs.writeFileSync(`${langDir}/${name}`, newContent);
  });
}

function importLang(lang, filePath) {
  const langDir = `${CONFIG.vicsDir}/${CONFIG.langMap[lang]}`;
  if (!fs.existsSync(langDir)) {
    console.log(`${lang} 对应的语言目录不存在，请使用 --sync 先同步语料`);
    return false;
  }
  if (!fs.existsSync(filePath)) {
    console.log(`${filePath} 要导入的语料文件不存在，请先确认文件路径`);
    return false;
  }

  const langContent = xlsx.parse(filePath);

  if (langContent.length > 0) {
    updateLangFile(langContent, CONFIG.langMap[lang]);
    console.log(`已导入 ${lang} 对应的语料：${filePath}`);
  } else {
    console.log('没有找到要导入的语料');
  }
}

module.exports = { importLang };
