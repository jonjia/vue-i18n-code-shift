const _ = require('lodash');
const compiler = require('vue-template-compiler');
const ts = require('typescript');
const { getSpecifiedFiles, readFile } = require('./file');
const { getProjectConfig } = require('./config');

const CONFIG = getProjectConfig();
const DOUBLE_BYTE_REGEX = /[^\x00-\xff]/g;
// const PART_DOUBLE_BYTE_REGEX = /[^\x00-\xff]+/g;

function findTextInTemplate(code) {
  const matches = [];

  const { ast } = compiler.compile(code, {
    outputSourceRange: true,
    whitespace: 'preserve',
  });

  function visitAttr(attr) {
    const { name, value, start, end } = attr;
    if (value && value.match(DOUBLE_BYTE_REGEX)) {
      matches.push({
        range: { start, end },
        text: value,
        name,
        isAttr: true,
        isString: true,
        isTemplate: true,
      });
    }
  }

  function visit(node) {
    const { type, text, start, end } = node;
    if ((type === 3 || type === 2) && text && text.match(DOUBLE_BYTE_REGEX)) {
      matches.push({
        range: { start, end },
        text,
        isAttr: false,
        isString: true,
        isTemplate: true,
      });
    }

    if (node.attrsList && node.attrsList.length) {
      node.attrsList.forEach(visitAttr);
    }

    if (node.scopedSlots) {
      node.children = Object.values(node.scopedSlots);
      node.children.forEach(visit);
    } else if (
      node.ifConditions &&
      node.ifConditions.filter((item) => item.block.end !== node.end).length > 0
    ) {
      node.ifConditions
        .filter((item) => item.block.end !== node.end)
        .map((item) => item.block)
        .forEach(visit);
      node.children.forEach(visit);
    } else if (node.children && node.children.length) {
      node.children.forEach(visit);
    }
  }

  visit(ast);

  return matches;
}

function findTextInJs(code) {
  const matches = [];
  const ast = ts.createSourceFile(
    '',
    code,
    ts.ScriptTarget.ES2015,
    true,
    ts.ScriptKind.TSX
  );

  function visit(node) {
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        /** 判断 Ts 中的字符串含有中文 */
        const { text } = node;
        if (text.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          const range = { start, end };
          matches.push({
            range,
            text,
            isAttr: false,
            isString: true,
          });
        }
        break;
      }
      case ts.SyntaxKind.TemplateExpression: {
        const { pos, end } = node;
        const templateContent = code.slice(pos, end);

        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          const range = { start, end };
          matches.push({
            range,
            text: code.slice(start + 1, end - 1),
            isAttr: false,
            isString: true,
          });
        }
        break;
      }
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral: {
        const { pos, end } = node;
        const templateContent = code.slice(pos, end);

        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          const range = { start, end };
          matches.push({
            range,
            text: code.slice(start + 1, end - 1),
            isAttr: false,
            isString: true,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(ast, visit);

  return matches;
}

function findChineseText(filePath) {
  const fileContent = readFile(filePath);
  if (!fileContent) {
    return [];
  }
  if (filePath.endsWith('.vue')) {
    const { template, script } = compiler.parseComponent(fileContent);
    const textInTemplate = template ? findTextInTemplate(template.content) : [];
    const textInJs = script ? findTextInJs(script.content) : [];
    return [...textInTemplate, ...textInJs];
  } else if (filePath.endsWith('.js')) {
    return findTextInJs(fileContent);
  }
}

function findAllChineseText(dirPath) {
  const filesPath = getSpecifiedFiles(
    dirPath,
    CONFIG.ignoreDir,
    CONFIG.ignoreFile
  );
  const filterFiles = filesPath.filter((filePath) => {
    return filePath.endsWith('.vue') || filePath.endsWith('.js');
  });
  const allTexts = filterFiles.reduce((all, filePath) => {
    const texts = findChineseText(filePath);
    // 调整文案顺序，保证从后面的文案往前替换，避免位置更新导致替换出错
    const sortTexts = _.sortBy(texts, (obj) => -obj.range.start);

    if (texts.length > 0) {
      console.log(`${filePath} 发现中文文案`);
    }

    return texts.length > 0 ? all.concat({ filePath, texts: sortTexts }) : all;
  }, []);

  return allTexts;
}

module.exports = { findAllChineseText };
