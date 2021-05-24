#!/usr/bin/env node

const chalk = require('chalk');
const commander = require('commander');
const inquirer = require('inquirer');
const ora = require('ora');
const packageJson = require('../package.json');
const { getProjectConfig } = require('./utils/config');
const { init } = require('./commands/init');
const { extractAll } = require('./commands/extract');
const { replaceAll } = require('./commands/replace');
const { sync } = require('./commands/sync');
const { exportLang } = require('./commands/export');
const { importLang } = require('./commands/import');
const { moveRules } = require('./commands/moveRules');
const { check } = require('./commands/check');

const CONFIG = getProjectConfig();

const program = new commander.Command('vics').version(
  packageJson.version,
  '-v, --version'
);

program
  .command('init')
  .description('初始化项目')
  .action(async () => {
    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      default: true,
      message: '是否已存在 vics 相关目录？',
    });

    if (!confirm) {
      spining('初始化项目', async () => {
        await init();
      });
    } else {
      const { dir } = await inquirer.prompt({
        type: 'input',
        name: 'dir',
        message: '请输入 vics 相关目录：',
      });
      spining('初始化项目', async () => {
        await init(dir);
      });
    }
  });

program
  .command('one [dirPath] [level] [langFilename]')
  .description('一键提取并替换指定文件夹、指定层级(默认为0)下的所有中文文案')
  .action(async (dirPath, level, langFilename) => {
    if (!CONFIG.baiduAppid) {
      console.log('请配置 baiduAppid');
      return;
    }

    if (dirPath) {
      await extractAndReplace(dirPath, level, langFilename);
    } else {
      console.log('一键提取替换需要指定文件夹路径');
    }
  });

program
  .command('extract [dirPath] [level] [langFilename]')
  .description('提取指定文件夹、指定层级(默认为0)下的所有中文文案')
  .action(async (dirPath, level, langFilename) => {
    if (dirPath) {
      await extractAll(dirPath, level, langFilename);
    } else {
      console.log('提取需要指定文件夹路径');
    }
  });

program
  .command('replace [dirPath] [level] [langFilename]')
  .description('替换指定文件夹、指定层级(默认为0)下的所有中文文案')
  .action(async (dirPath, level, langFilename) => {
    if (dirPath) {
      await replaceAll(dirPath, level, langFilename);
    } else {
      console.log('替换需要指定文件夹路径');
    }
  });

program
  .command('sync')
  .description('同步各种语言的文案，使用百度翻译 mock 语料')
  .action(async () => {
    spining('各种语言文案同步', async () => {
      await sync();
    });
  });

program
  .command('export [lang] [range] [businessLine] [outputFilename]')
  .description('导出未翻译的文案')
  .action(async (lang, range, businessLine, outputFilename) => {
    spining('导出未翻译的文案', async () => {
      if (lang && !range) {
        await exportLang();
      } else if (range && businessLine && outputFilename) {
        await exportLang(lang, range, businessLine, outputFilename);
      }
    });
  });

program
  .command('import [lang] [filePath]')
  .description('将翻译好的文案，导入到项目中')
  .action(async (lang, filePath) => {
    spining('导入翻译好的文案', async () => {
      if (lang && !filePath) {
        await importLang();
      } else if (filePath) {
        await importLang(lang, filePath);
      }
    });
  });

program
  .command('moveRules <paths...>')
  .description('移动 rules')
  .action(async (paths) => {
    if (paths.length > 0) {
      await moveRules(paths);
    }
  });

program
  .command('check [filePath]')
  .description('校验语料')
  .action(async (filePath) => {
    spining('校验语料', async () => {
      await check(filePath);
    });
  });

program.on('--help', () => {
  console.log();
  console.log(
    `  Run ${chalk.cyan(
      `vics <command> --help`
    )} for detailed usage of given command.`
  );
  console.log();
});

program.commands.forEach((c) => c.on('--help', () => console.log()));

program.parse(process.argv);

async function spining(text, doAsync) {
  const spinner = ora(`${text}中...`).start();
  try {
    if (doAsync) {
      await doAsync();
    }
    spinner.succeed(`${text}成功`);
  } catch (error) {
    spinner.fail(`${text}失败：${error}`);
  }
}

async function extractAndReplace(dirPath, level, langFilename) {
  await extractAll(dirPath, level, langFilename);
  await replaceAll(dirPath, level, langFilename);
}
