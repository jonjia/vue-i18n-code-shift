const axios = require('axios').default;
const MD5 = require('./md5');
const { getProjectConfig } = require('./config');

const BAI_DU_LIMIT_WORD = 800;

function withTimeout(promise, ms) {
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(`Promise timed out after ${ms} ms.`);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

function translateTextByBaidu(texts, toLang) {
  const textsStr = texts.join('\n');
  const { baiduAppid, baiduKey, langMap } = getProjectConfig();
  const salt = new Date().getTime();
  const signStr = baiduAppid + textsStr + salt + baiduKey;
  const sign = MD5(signStr);
  return withTimeout(
    new Promise((resolve, reject) => {
      axios
        .get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
          params: {
            q: textsStr,
            from: 'zh',
            to: langMap[toLang] || '',
            appid: baiduAppid,
            salt,
            sign,
          },
        })
        .then(({ status, data }) => {
          if (status === 200) {
            const { trans_result } = data;
            resolve(trans_result ? trans_result.map(({ dst }) => dst) : []);
          } else {
            reject(data);
          }
        });
    }),
    5000
  );
}

function cutText(allTexts) {
  const len = allTexts.length;
  const textLength = allTexts.join('').length;
  if (textLength < BAI_DU_LIMIT_WORD - len) {
    return [allTexts];
  }

  const res = [];
  const count = Math.ceil(textLength / BAI_DU_LIMIT_WORD);
  const num = Math.floor(len / count);
  for (let i = 0; i <= count; i += 1) {
    res.push(allTexts.slice(num * i, num * (i + 1)));
  }

  return res;
}

async function translateTexts(texts, toLang = 'en_US') {
  const allTexts = texts.reduce((acc, curr) => {
    // 避免翻译的字符里包含数字或者特殊字符等情况
    const reg = /[^a-zA-Z\x00-\xff]+/g;
    const findText = curr.match(reg);
    const transText = findText ? findText.join('').slice(0, 6) : '中文符号';
    return acc.concat(transText);
  }, []);
  try {
    let result = [];
    for await (piece of cutText(allTexts)) {
      if (piece.length && piece.join('').length) {
        const translated = await translateTextByBaidu(piece, toLang);
        result = [...result, ...translated];
      }
    }
    return [...result];
  } catch (err) {
    console.log(err);
  }
}

async function translateFiles(files) {
  let translatedFiles = [];
  for await (let file of files) {
    const { filePath, texts: textObjs } = file;
    const texts = Array.from(new Set(textObjs.map((textObj) => textObj.text)));
    const translatedTexts = await translateTexts(texts);
    translatedFiles.push({ filePath, texts, translatedTexts });
  }
  return translatedFiles;
}

module.exports = {
  translateFiles,
  translateTexts,
};
