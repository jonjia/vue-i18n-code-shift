const _ = require('lodash');
const compiler = require('vue-template-compiler');
const ts = require('typescript');
const { parse, AST } = require('vue-eslint-parser');
const { getSpecifiedFiles, readFile } = require('./file');
const { getProjectConfig } = require('./config');
const { includeChinese } = require('./includeChinese');

const CONFIG = getProjectConfig();
const NEW_LINE_RE = /\n\s+/g;
const AST_NODE_TYPE = {};
const types = Object.keys(AST.KEYS);
for (let type of types) {
  AST_NODE_TYPE[type] = type;
}

function findTextInTemplate(code) {
  const matches = [];

  const ast = parse(code, {
    sourceType: 'module',
  });

  function visitAttr(attr) {
    if (!attr || !attr.value) {
      return;
    }
    const attrValueNode = attr.value;
    const {
      type,
      value,
      range: [start, end],
    } = attrValueNode;

    if (type === AST_NODE_TYPE.VLiteral && includeChinese(value)) {
      matches.push({
        range: { start, end },
        value,
        isAttr: true,
      });
    }

    if (type === AST_NODE_TYPE.VExpressionContainer) {
      const expressionNode = attrValueNode.expression;
      if (expressionNode.type === AST_NODE_TYPE.MemberExpression) {
        const obj = expressionNode.object;
        if (obj.type === AST_NODE_TYPE.ArrayExpression) {
          obj.elements.forEach(visit);
        }
      } else if (expressionNode.type === AST_NODE_TYPE.ArrayExpression) {
        expressionNode.elements.forEach(visit);
      }
    }
  }

  function visit(node) {
    const {
      type,
      value,
      range: [start, end] = [],
      startTag: { attributes } = {},
    } = node;

    if (type === AST_NODE_TYPE.VText && includeChinese(value)) {
      let newValue = value;
      let s = start;
      let e = end;
      const [before = '', after = ''] = value.match(NEW_LINE_RE) || [];
      if (before) {
        newValue = newValue.slice(
          before.length,
          newValue.length - after.length
        );
        s += before.length;
        e -= after.length;
      }
      matches.push({
        range: { start: s, end: e },
        value: newValue,
        isAttr: false,
      });
    }

    if (type === AST_NODE_TYPE.Literal && includeChinese(value)) {
      matches.push({
        range: { start: node.start, end: node.end },
        value,
        isAttr: false,
      });
    }

    if (type === AST_NODE_TYPE.VExpressionContainer) {
      const expressionNode = node.expression;
      if (expressionNode.type === AST_NODE_TYPE.MemberExpression) {
        const obj = expressionNode.object;
        if (obj.type === AST_NODE_TYPE.ArrayExpression) {
          obj.elements.forEach(visit);
        }
      }
    }

    if (attributes && attributes.length > 0) {
      attributes.forEach(visitAttr);
    }

    if (node.children && node.children.length) {
      node.children.forEach(visit);
    }
  }

  visit(ast.templateBody);

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
        if (includeChinese(text)) {
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

        if (includeChinese(templateContent)) {
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

        if (includeChinese(templateContent)) {
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
    const templateContent = fileContent.split('<script>')[0];
    const { script } = compiler.parseComponent(fileContent);
    const textInTemplate = templateContent
      ? findTextInTemplate(templateContent)
      : [];
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
