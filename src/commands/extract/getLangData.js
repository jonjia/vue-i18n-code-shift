const fs = require('fs');

function getLangData(filename) {
  if (fs.existsSync(filename)) {
    return getLangJson(filename);
  } else {
    return {};
  }
}

function getLangJson(filename) {
  const fileContent = fs.readFileSync(filename, 'utf8');
  let obj = fileContent.match(/export\s*default\s*({[\s\S]+);?$/)[1];
  obj = obj.replace(/\s*;\s*$/, '');
  let jsObj = {};
  try {
    jsObj = eval('(' + obj + ')');
  } catch (err) {
    console.log(obj);
    console.error(err);
  }
  return jsObj;
}

module.exports = {
  getLangData
};
