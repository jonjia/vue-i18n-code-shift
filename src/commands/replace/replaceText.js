const _ = require('lodash');
const compiler = require('vue-template-compiler');
const ts = require('typescript');
const { getLangData } = require('../extract/getLangData');
const { getProjectConfig, getLangDir } = require('../../utils/config');
const { readFile, writeFile } = require('../../utils/file');
const { findMatchKey, formatText } = require('../../utils/common');
const { updateLangFileWithNewText } = require('../extract/updateLangFile');

const CONFIG = getProjectConfig();
const srcLangDir = getLangDir(CONFIG.srcLang);
const DOUBLE_BYTE_REGEX_WITH_ESCAPE =
  /[^\x00-\xff]|\(|\)|-|[0-9|a-z|A-Z]|&|\+|=/g;
const DOUBLE_BYTE_REGEX = /[^\x00-\xff]/g;

function updateTargetFile({ filePath, texts, langObj, langFilename }) {
  const fileContent = readFile(filePath);
  let newFileContent = fileContent;
  const langFileNewTexts = [];
  const isVueFile = _.endsWith(filePath, '.vue');
  if (isVueFile) {
    const { template, script } = compiler.parseComponent(fileContent);
    const templateCode = template ? template.content : '';
    const jsCode = script ? script.content : '';

    texts.forEach((target) => {
      const {
        text,
        range: { start, end },
        isString,
        isTemplate,
        isAttr,
      } = target;
      if (text.includes('[') && text.includes(']')) {
        return;
      }
      const matchedKey = findMatchKey(langObj, formatText(text));
      let langFileText = text;
      if (isString && !isAttr) {
        let replaceText = `I18N.t('${langFilename}.${matchedKey}')`;
        let oldText = jsCode.slice(start, end);
        let left = jsCode.slice(start, start + 1);
        let right = jsCode.slice(end - 1, end);
        if (isTemplate) {
          replaceText = `{{ \$t('${langFilename}.${matchedKey}') }}`;
          left = templateCode.slice(start, start + 1);
          right = templateCode.slice(end + 1, end + 2);
          oldText = templateCode.slice(start, end + 2);
        }

        let newText = `${left}${replaceText}${right}`;
        if (!isTemplate && (left === '"' || left === "'")) {
          newText = `${replaceText}`;
        } else if (!isTemplate && left === '`') {
          const varInStr = text.match(/(\$\{[^\}]+?\})/g);
          if (varInStr) {
            const kvPair = varInStr.map((str, index) => {
              return `val${index + 1}: ${str.replace(/^\${([^\}]+)\}$/, '$1')}`;
            });
            newText = `I18N.t('${langFilename}.${matchedKey}', { ${kvPair.join(
              ',\n'
            )} })`;

            varInStr.forEach((str, index) => {
              langFileText = langFileText.replace(str, `{val${index + 1}}`);
            });
          } else {
            newText = `${replaceText}`;
          }
        } else if (isTemplate && oldText.includes('{{')) {
          const old = templateCode.slice(start + 1, end + 1);
          oldText = old
            .replace(/\\n/g, '')
            .replace(/\s*/g, '')
            .replace(/{{/, '')
            .replace(/}}/, '');
          newText = ` \$t('${langFilename}.${matchedKey}') `;
        }
        if (oldText.includes('>')) {
          oldText = oldText.match(DOUBLE_BYTE_REGEX_WITH_ESCAPE).join('');
          newText = `{{ \$t('${langFilename}.${matchedKey}') }}`;
        }
        if (matchedKey) {
          newFileContent = newFileContent.replace(
            new RegExp(oldText, 'g'),
            function (match, offset, string) {
              const beforeStr = string.slice(0, offset);
              if (isTemplate && beforeStr.includes('<script>')) {
                return oldText;
              }

              const prevChar = string.slice(offset - 1, offset);
              const nextChar = string.slice(
                offset + oldText.length,
                offset + oldText.length + 1
              );
              if (
                isTemplate &&
                (prevChar.match(DOUBLE_BYTE_REGEX) ||
                  nextChar.match(DOUBLE_BYTE_REGEX))
              ) {
                return oldText;
              }

              return newText;
            }
          );
        }
      } else if (isString && isAttr) {
        const oldAttr = templateCode.slice(start + 1, end + 1);
        let replaceAttr = `\$t('${langFilename}.${matchedKey}')`;
        const [left] = oldAttr.match(/\s*/g);
        let newAttr = `${left}:${oldAttr.trim().replace(text, replaceAttr)}`;
        if (matchedKey) {
          newFileContent = newFileContent.replace(oldAttr, newAttr);
        }
      }
      if (text !== langFileText) {
        langFileNewTexts.push({ key: matchedKey, value: langFileText });
      }
    });
  } else {
    texts.forEach((target) => {
      const {
        text,
        range: { start, end },
        isString,
      } = target;
      const matchedKey = findMatchKey(langObj, formatText(text));
      let langFileText = text;
      if (isString) {
        const replaceText = `I18N.t('${langFilename}.${matchedKey}')`;
        const oldText = fileContent.slice(start, end);
        const left = fileContent.slice(start, start + 1);
        const right = fileContent.slice(end - 1, end);

        let newText = `${left}${replaceText}${right}`;
        if (left === '"' || left === "'") {
          newText = `${replaceText}`;
        } else if (left === '`') {
          const varInStr = text.match(/(\$\{[^\}]+?\})/g);
          if (varInStr) {
            const kvPair = varInStr.map((str, index) => {
              return `val${index + 1}: ${str.replace(/^\${([^\}]+)\}$/, '$1')}`;
            });
            newText = `I18N.t('${langFilename}.${matchedKey}', { ${kvPair.join(
              ',\n'
            )} })`;

            varInStr.forEach((str, index) => {
              langFileText = langFileText.replace(str, `{val${index + 1}}`);
            });
          } else {
            newText = `${replaceText}`;
          }
        }
        if (matchedKey) {
          newFileContent = newFileContent.replace(oldText, newText);
        }
      }
      if (text !== langFileText) {
        langFileNewTexts.push({ key: matchedKey, value: langFileText });
      }
    });
  }

  try {
    const targetFilename = `${srcLangDir}/${langFilename}.js`;
    updateLangFileWithNewText(targetFilename, langFileNewTexts);
    writeFile(filePath, newFileContent);

    const hasScriptTarget = texts.some((target) => !target.isTemplate);
    if (hasScriptTarget && !hasImportI18N(filePath)) {
      createImportI18N(filePath);
    }
  } catch (error) {
    console.log(error);
  }
}

function getJsCode(filePath) {
  const fileContent = readFile(filePath);
  const isVueFile = _.endsWith(filePath, '.vue');
  let code = fileContent;
  if (isVueFile) {
    const { script } = compiler.parseComponent(fileContent);
    code = script ? script.content : '';
  }

  return { code, isVueFile, fileContent };
}

function hasImportI18N(filePath) {
  const { code } = getJsCode(filePath);
  const ast = ts.createSourceFile(
    '',
    code,
    ts.ScriptTarget.ES2015,
    true,
    ts.ScriptKind.TSX
  );
  let hasImport = false;

  function visit(node) {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      const importPath = node.moduleSpecifier.getText();

      if (importPath.includes(CONFIG.i18nPath)) {
        hasImport = true;
      }
    }
  }

  ts.forEachChild(ast, visit);

  return hasImport;
}

function createImportI18N(filePath) {
  const { code, isVueFile, fileContent } = getJsCode(filePath);
  const importStatement = `${CONFIG.importI18N}\n`;

  if (isVueFile) {
    const newContent = fileContent.replace(
      '<script>\n',
      `<script>\n${importStatement}`
    );
    writeFile(filePath, newContent);
  } else {
    const ast = ts.createSourceFile(
      '',
      code,
      ts.ScriptTarget.ES2015,
      true,
      ts.ScriptKind.TSX
    );
    const pos = ast.getStart(ast, false);
    const updateCode = code.slice(0, pos) + importStatement + code.slice(pos);
    writeFile(filePath, updateCode);
  }
}

function replaceTargets(langFilename, translateTargets) {
  const targetFilename = `${srcLangDir}/${langFilename}.js`;
  const langObj = getLangData(targetFilename);

  translateTargets.forEach(({ filePath, texts }) => {
    updateTargetFile({ filePath, texts, langObj, langFilename });
  });
}

module.exports = { replaceTargets };
