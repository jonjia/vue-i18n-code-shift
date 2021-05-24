const fs = require('fs');
const path = require('path');
const { PROJECT_CONFIG, CONFIG_FILE_NAME } = require('../constants');

function lookForFiles(dir, filename) {
  const files = fs.readdirSync(dir);

  for (let file of files) {
    const currName = path.join(dir, file);
    const info = fs.statSync(currName);
    if (info.isDirectory()) {
      if (['.git', 'node_modules', '.vscode'].includes(file)) {
        continue;
      }
      const result = lookForFiles(currName, filename);
      if (result) {
        return result;
      }
    } else if (info.isFile() && file === filename) {
      return currName;
    }
  }
}

function getProjectConfig() {
  const rootDir = path.resolve(process.cwd(), `./`);
  const configFile = lookForFiles(rootDir, CONFIG_FILE_NAME);
  let config = PROJECT_CONFIG.defaultConfig;

  if (configFile && fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  }
  return config;
}

function getVicsDir() {
  const config = getProjectConfig();
  if (config) {
    return config.vicsDir;
  }
}

function getLangDir(lang) {
  const langsDir = getVicsDir();
  return path.resolve(langsDir, lang);
}

module.exports = {
  lookForFiles,
  getProjectConfig,
  getVicsDir,
  getLangDir,
};
