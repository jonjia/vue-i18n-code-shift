// https://github.com/alsotang/is-chinese

const chineseRange = [
  // Chinese punctuation
  0x00b7, //·
  0x00d7, //×
  0x2014, //—
  0x2018, //‘
  0x2019, //’
  0x201c, //“
  0x201d, //”
  0x2026, //…
  0x3001, //、
  0x3002, //。
  0x300a, //《
  0x300b, //》
  0x300e, //『
  0x300f, //』
  0x3010, //【
  0x3011, //】
  0xff01, //！
  0xff08, //（
  0xff09, //）
  0xff0c, //，
  0xff1a, //：
  0xff1b, //；
  0xff1f, //？

  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x20000, 0x2a6df], // CJK Unified Ideographs Extension B
  [0x2a700, 0x2b73f], // CJK Unified Ideographs Extension C
  [0x2b740, 0x2b81f], // CJK Unified Ideographs Extension D
  [0x2b820, 0x2ceaf], // CJK Unified Ideographs Extension E
  [0xf900, 0xfaff], // CJK Compatibility Ideographs

  [0x3300, 0x33ff], // https://en.wikipedia.org/wiki/CJK_Compatibility
  [0xfe30, 0xfe4f], // https://en.wikipedia.org/wiki/CJK_Compatibility_Forms
  [0xf900, 0xfaff], // https://en.wikipedia.org/wiki/CJK_Compatibility_Ideographs
  [0x2f800, 0x2fa1f], // https://en.wikipedia.org/wiki/CJK_Compatibility_Ideographs_Supplement
];

const cnReStr = chineseRange
  .map((range) => {
    if (!Array.isArray(range)) {
      return `\\u{${range.toString(16)}}`;
    }
    return `[\\u{${range[0].toString(16)}}-\\u{${range[1].toString(16)}}]`;
  })
  .join('|');

const cnRe = new RegExp(`${cnReStr}`, 'ug');

const includeChinese = function (str = '') {
  return str.match(cnRe);
};

module.exports = { includeChinese };
