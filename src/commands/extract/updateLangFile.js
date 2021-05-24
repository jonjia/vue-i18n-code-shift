const fs = require('fs-extra');
const _ = require('lodash');
const randomstring = require('randomstring');
const { getLangData } = require('./getLangData');
const { getProjectConfig, getLangDir } = require('../../utils/config');
const { formatText, prettierFile } = require('../../utils/common');

const CONFIG = getProjectConfig();
const srcLangDir = getLangDir(CONFIG.srcLang);

function updateLangFiles(filename, translatedFiles) {
  const targetFilename = `${srcLangDir}/${filename}.js`;
  if (!fs.existsSync(targetFilename)) {
    fs.writeFileSync(
      targetFilename,
      updateExistLangFile(null, translatedFiles)
    );
    addImportToMainLangFile(filename);
    console.log(`成功新建语言文件 ${targetFilename}`);
  } else {
    fs.writeFileSync(
      targetFilename,
      updateExistLangFile(targetFilename, translatedFiles)
    );
    console.log(`成功更新语言文件 ${targetFilename}`);
  }
}

function updateLangFileWithNewText(filename, textPairs) {
  let obj = {};
  if (filename) {
    const fileContent = getLangData(filename);
    obj = fileContent;
    if (Object.keys(obj).length === 0) {
      console.log(`${filename} 解析失败，该文件包含的文案无法自动补全`);
      return;
    }
  }

  textPairs.forEach(({ key, value }) => {
    if (key) {
      _.set(obj, key, value);
    }
  });

  const newContent = prettierFile(
    `export default ${JSON.stringify(obj, null, 2)}`
  );
  fs.writeFileSync(filename, newContent);
}

function updateExistLangFile(filename, translations) {
  let obj = {};
  if (filename) {
    const fileContent = getLangData(filename);
    obj = fileContent;
    if (Object.keys(obj).length === 0) {
      console.log(`${filename} 解析失败，该文件包含的文案无法自动补全`);
      return;
    }
  }

  translations.forEach(({ texts, translatedTexts }) => {
    translatedTexts.forEach((translatedText, index) => {
      const value = formatText(texts[index]);
      let camelCaseKey = _.camelCase(translatedText);

      if (!Object.values(obj).includes(value)) {
        if (
          Object.keys(obj).includes(camelCaseKey) &&
          obj[camelCaseKey] !== value
        ) {
          while (Object.keys(obj).includes(camelCaseKey)) {
            const uuidChar = `${randomstring.generate({
              length: 1,
              charset: 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
            })}`;
            camelCaseKey = _.camelCase(`${camelCaseKey} ${uuidChar}`);
          }
          console.log(
            `"${value}" 需要的 key 已经被占用，随机分配为：${camelCaseKey}`
          );
        }
        if (camelCaseKey) {
          _.set(obj, camelCaseKey, value);
        }
      }
    });
  });
  return prettierFile(`export default ${JSON.stringify(obj, null, 2)}`);
}

function addImportToMainLangFile(newFilename) {
  let mainContent = '';
  if (fs.existsSync(`${srcLangDir}/index.js`)) {
    mainContent = fs.readFileSync(`${srcLangDir}/index.js`, 'utf8');
    mainContent = mainContent.replace(
      /^(\s*import.*?;)$/m,
      `$1\nimport ${newFilename} from './${newFilename}';`
    );
    if (/(}\);)/.test(mainContent)) {
      if (/\,\n(}\);)/.test(mainContent)) {
        /** 最后一行包含,号 */
        mainContent = mainContent.replace(/(}\);)/, `  ${newFilename},\n$1`);
      } else {
        /** 最后一行不包含,号 */
        mainContent = mainContent.replace(
          /\n(}\);)/,
          `,\n  ${newFilename},\n$1`
        );
      }
    }
    // 兼容 export default { common };的写法
    if (/(};)/.test(mainContent)) {
      if (/\,\n(};)/.test(mainContent)) {
        /** 最后一行包含,号 */
        mainContent = mainContent.replace(/(};)/, `  ${newFilename},\n$1`);
      } else {
        /** 最后一行不包含,号 */
        mainContent = mainContent.replace(/\n(};)/, `,\n  ${newFilename},\n$1`);
      }
    }
  } else {
    mainContent = `import ${newFilename} from './${newFilename}';\n\nexport default Object.assign({}, {\n  ${newFilename},\n});`;
  }

  fs.writeFileSync(`${srcLangDir}/index.js`, mainContent);
}

module.exports = { updateLangFiles, updateLangFileWithNewText };
