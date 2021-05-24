const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const compiler = require('vue-template-compiler');
const ts = require('typescript');
const { getSpecifiedFiles, readFile, writeFile } = require('../../utils/file');
const { getProjectConfig } = require('../../utils/config');

const CONFIG = getProjectConfig();

const moveRulesForFile = async (filePath) => {
  const fileContent = readFile(filePath);
  const { script } = compiler.parseComponent(fileContent);
  const jsCode = script ? script.content : '';
  const ast = ts.createSourceFile(
    '',
    jsCode,
    ts.ScriptTarget.ES2015,
    true,
    ts.ScriptKind.TSX
  );
  let newJsCode = jsCode;

  const exportAssignment = ast.statements.find(
    (node) => node.kind === ts.SyntaxKind.ExportAssignment
  );
  if (exportAssignment) {
    const dataProp = exportAssignment.expression.properties.find(
      (node) =>
        node.kind === ts.SyntaxKind.MethodDeclaration &&
        node.name &&
        node.name.text === 'data'
    );

    if (!dataProp) {
      return;
    }
    const rulesProp = dataProp.body.statements[0].expression.properties.find(
      (node) =>
        node.kind === ts.SyntaxKind.PropertyAssignment &&
        node.name &&
        node.name.text.toLowerCase().includes('rules')
    );

    if (!rulesProp) {
      return;
    }
    const rulePropName = rulesProp.name.text;
    const rulesStr = jsCode.slice(rulesProp.pos, rulesProp.end);

    const computedProp = exportAssignment.expression.properties.find(
      (node) =>
        node.kind === ts.SyntaxKind.PropertyAssignment &&
        node.name &&
        node.name.text === 'computed'
    );

    if (computedProp) {
      // 1.delete rules in data option
      newJsCode =
        jsCode.slice(0, rulesProp.pos - 1) + jsCode.slice(rulesProp.end);

      const computedStr = jsCode.slice(computedProp.pos, computedProp.end);

      const newComputedStr = computedStr.replace(
        /\n\s+\}$/,
        function (match, offset, str) {
          const prefix = str.slice(0, offset);
          const rulesMethod =
            rulesStr.replace(
              `${rulePropName}:`,
              `${rulePropName}(){\nreturn `
            ) + ';},';
          return `${prefix.endsWith(',') ? '' : ','}${rulesMethod}${match}`;
        }
      );

      // 2.insert the rules in computed option
      newJsCode = newJsCode.replace(computedStr, newComputedStr);
    } else {
      let beforeDataProp = jsCode.slice(0, dataProp.end + 1);
      // 1.delete rules in data option
      beforeDataProp =
        beforeDataProp.slice(0, rulesProp.pos - 1) +
        beforeDataProp.slice(rulesProp.end);
      const afterDataProp = jsCode.slice(dataProp.end + 1);
      const rulesMethod =
        rulesStr.replace(`${rulePropName}:`, `${rulePropName}(){\nreturn `) +
        ';},';
      // 2.add computed prop
      newJsCode = `${beforeDataProp}\ncomputed: {${rulesMethod}},${afterDataProp}`;
    }

    const newFileContent = fileContent.replace(jsCode, newJsCode);

    writeFile(filePath, newFileContent);

    const eslintPath = path.resolve(
      process.cwd(),
      `./node_modules/.bin/eslint`
    );
    if (fs.existsSync(eslintPath)) {
      await lintFixFile(eslintPath, filePath);
    } else {
      console.log(
        '未找到 /node_modules/.bin/eslint 目录，请在项目根目录执行，否则无法修正代码格式'
      );
    }
  }
};

const lintFixFile = async (eslintPath, filePath) => {
  const child = spawn(eslintPath, ['--fix', filePath]);
  let data = '';
  for await (const chunk of child.stdout) {
    console.log('stdout chunk: ' + chunk);
    data += chunk;
  }
  return data;
};

const moveRulesForDir = async (dir) => {
  const filesPath = getSpecifiedFiles(dir, CONFIG.ignoreDir, CONFIG.ignoreFile);
  const filterFiles = filesPath.filter((filePath) => filePath.endsWith('.vue'));
  if (filterFiles.length > 0) {
    for await (let path of filterFiles) {
      await moveRulesForFile(path);
    }
  } else {
    console.log(`${dir} 下未发现需要移动 rules 的 .vue 文件`);
  }
};

const moveRules = async (paths) => {
  console.log('开始移动 rules');
  for await (let path of paths) {
    try {
      if (!path || !fs.existsSync(path)) {
        console.log(`${path} 未找到`);
        return;
      } else if (fs.statSync(path).isDirectory()) {
        await moveRulesForDir(path);
      } else {
        await moveRulesForFile(path);
      }
    } catch (error) {
      console.log(`${path}: ${error}`);
    }
  }
  console.log('移动完成');
};

module.exports = { moveRules };
