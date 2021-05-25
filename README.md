# vue-i18n-code-shift

vue 项目国际化全流程解决方案: 一个命令行工具，对代码里的中文文案一键完成提取、替换、翻译、导入、导出等，告别手动操作

## 功能

- **一键提取并替换中文文案**
- **导出未翻译的文案**
- **导入翻译好的文案**

## 安装

```shellscript
npm install -g vue-i18n-code-shift
```

## 使用

### 示例

1. 在项目根目录（example/projectAfter）使用 `vics init` 命令初始化，生成配置文件（默认是 .vics 目录）
2. 使用 `vics one` 命令一键提取替换(也可以分步使用 `vics extract` 和 `vics replace` 命令)
3. 使用 `vics export en` 导出未翻译的文件，就可以送翻了
4. 使用 `vics sync` 暂时 mock 语料
5. 使用 `vics import en 翻译好的 xlsx 文件路径` 导入翻译好的语料

### 效果

- .vue 文件
  ![vue](https://github.com/jonjia/vue-i18n-code-shift/raw/feature/example/assets/vue.png)
- .js 文件
  ![js](https://github.com/jonjia/vue-i18n-code-shift/raw/feature/example/assets/js.png)

## 命令

### `vics init`

初始化项目，生成配置文件 `vics-config.json`

```js
{
  // vics文件根目录，用于放置提取的langs文件
  vicsDir: './.vics',

  // 配置文件目录，若调整配置文件，此处可手动修改
  configFile: './.vics/vics-config.json',

  // 语言目录名，注意连线和下划线
  srcLang: 'zh-CN',
  distLangs: ['en'],
  langMap: {
    'en_US': 'en',
    'en-US': 'en',
    'en': 'en',
  },

  // 百度翻译
  baiduAppid: '',
  baiduKey: '',

  // I18N import 语句，请按照自己项目情况配置
  importI18N: "import I18N from '@/i18n';",
  // import 语句后缀，用于判断是否已经引入过
  i18nPath: '@/i18n',

  // 可跳过的文件夹名或者文加名，比如docs、mock等
  ignoreDir: [],
  ignoreFile: [],

  // 导出未翻译的文案，Excel 列的配置
  exportColConfig: ['export_path', '业务线', 'business_key', '描述（字典值）', '语料类型', '最长字符', '首字母大写', '语料说明图', 'translatable', 'formatted', 'zh_CN'],
  // 导出未翻译的文案，业务线、key、文案在 Excel 中列的索引
  exportColIndexMap: {
    businessLine: 1,
    key: 3,
    text: 10,
  },
  // 导入翻译好的文案，key、文案在 Excel 中列的索引
  importColIndexMap: {
    key: 4,
    text: 12,
  },
  // 语料平台 xlsx 文件配置，列从 0 开始
  checkColIndexMap: {
    key: 3, // key 所在列
    'zh-CN': 11, // 中文所在列
    en: 12, // 英文所在列
  },
  // 语料文件 prettier 配置
  prettierConfig: {},
}
```

### `vics one`

**一键提取并替换**指定文件夹、指定层级（默认为 0）下的所有中文文案，可以指定语料文件（默认为指定文件夹名字）

```shellscript
vics one [dirPath] [level] [langFilename]
```

### `vics extract`

**提取**指定文件夹、指定层级(默认为 0)下的所有中文文案，可以指定语料文件（默认为指定文件夹名字）

```shellscript
vics extract [dirPath] [level] [langFilename]
```

### `vics replace`

**替换**指定文件夹、指定层级(默认为 0)下的所有中文文案，可以指定语料文件（默认为指定文件夹名字）

```shellscript
vics replace [dirPath] [level] [langFilename]
```

### `vics sync`

**同步**各种语言的文案，使用百度翻译 **mock** 语料

```shellscript
vics sync
```

### `vics export`

**导出**未翻译的文案

```shellscript
# 导出指定语言的中文文案，lang取值为配置中distLangs值(lang 参数必填)，如 en 就是导出还未翻译成英文的中文文案。可以指定业务线和产物文件名
# 导出范围：range // 0 未翻译，2 全部
vics export [lang] [range] [businessLine] [outputFilename]
```

### `vics import`

将翻译好的文案，**导入**到项目中

```shellscript
# 导入送翻后的文案
vics import [lang] [filePath]
```

### `vics moveRules`

将 rules 从 data 移动到 computed，用来解决 rules 多语言不生效问题

```shellscript
# 将 rules 从 data 移动到 computed
vics moveRules [dir/file...]
```

### `vics check`

比较翻译平台管理的语料、代码中使用的语料之间的差异

```shellscript
# 校验对比语料
vics check [filePath]
```

语料平台 xlsx 文件配置，列从 0 开始，编辑 vics-config.json checkColIndexMap 字段

```shellscript
  checkColIndexMap: {
    key: 3, // key 所在列
    'zh-CN': 11, // 中文所在列
    en: 12, // 英文所在列
  }
```

## vics 解决了哪些问题

- 解决 vue 项目国际化过程中，中文文案手动替换费时费力问题
- 在翻译过程中，可以使用 vics 命令行自动提取未翻译中文词汇，导出成 Excel 方便与翻译同学协作。针对翻译同学还没有返回翻译文案的期间，可以使用 vics 的 sync 和 mock 功能，先临时翻译成对应语言，节省文案调整时间
- 国际化文案翻译完成后，可以使用 vics 的 import 命令，一键导入到项目文件内
- 比较翻译平台管理的语料、代码中使用的语料之间的差异，主要提供给测试同学使用

## Authors

- **[jonjia](https://github.com/jonjia)**
- Inspired by **[kiwi](https://github.com/alibaba/kiwi)**

## License

- MIT
