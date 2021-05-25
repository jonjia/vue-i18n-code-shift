<template>
  <div class="hello">
    <h1>{{ $t('helloWorld.howToUse') }}<h1>
    <p>{{ $t('helloWorld.helloWorld') }}</p>
    <input :placeholder="$t('helloWorld.propertySubstitution')" />
  </div>
</template>

<script>
import I18N from '@/i18n';
export default {
  name: 'HelloWorld',
  mounted() {
    console.log(I18N.t('helloWorld.hello'), I18N.t('helloWorld.world'))
  }
}
</script>
