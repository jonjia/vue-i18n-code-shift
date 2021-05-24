const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const { lookForFiles } = require('../../utils/config');
const { PROJECT_CONFIG, CONFIG_FILE_NAME } = require('../../constants');

async function creteConfigFile(existDir) {
  if (!lookForFiles(path.resolve(process.cwd(), `./`), CONFIG_FILE_NAME)) {
    const existConfigFile = _.endsWith(existDir, '/')
      ? `${existDir}${CONFIG_FILE_NAME}`
      : `${existDir}/${CONFIG_FILE_NAME}`;
    if (
      existDir &&
      fs.existsSync(existDir) &&
      !fs.existsSync(existConfigFile)
    ) {
      const config = JSON.stringify(
        {
          ...PROJECT_CONFIG.defaultConfig,
          vicsDir: existDir,
          configFile: existConfigFile,
        },
        null,
        2
      );
      await fs.writeFile(existConfigFile, config, (err) => {
        if (err) {
          console.log(err);
        }
      });
    } else if (!fs.existsSync(PROJECT_CONFIG.configFile)) {
      const config = JSON.stringify(PROJECT_CONFIG.defaultConfig, null, 2);
      await fs.writeFile(PROJECT_CONFIG.configFile, config, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
  }
}

async function createCnFile() {
  const cnDir = `${PROJECT_CONFIG.dir}/zh-CN`;
  if (!fs.existsSync(cnDir)) {
    fs.mkdirSync(cnDir);
    await fs.writeFile(
      `${cnDir}/index.js`,
      PROJECT_CONFIG.zhIndexFile,
      (err) => {
        if (err) {
          console.log(err);
        }
      }
    );
    await fs.writeFile(
      `${cnDir}/common.js`,
      PROJECT_CONFIG.zhTestFile,
      (err) => {
        if (err) {
          console.log(err);
        }
      }
    );
  }
}

async function init(existDir) {
  /** 初始化配置文件夹 */
  if (existDir) {
    if (!fs.existsSync(existDir)) {
      console.log('输入的目录不存在，已为你生成默认文件夹');
      fs.mkdirSync(PROJECT_CONFIG.dir);
    }
  } else if (!fs.existsSync(PROJECT_CONFIG.dir)) {
    fs.mkdirSync(PROJECT_CONFIG.dir);
  }
  await creteConfigFile(existDir);
  if (!(existDir && fs.existsSync(existDir))) {
    await createCnFile();
  }
}

module.exports = { init };
