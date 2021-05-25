<template>
  <div class="hello">
    <h1>如何使用<h1>
    <p>你好，世界</p>
    <input placeholder="属性替换" />
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  mounted() {
    console.log('你好', '世界')
  }
}
</script>
