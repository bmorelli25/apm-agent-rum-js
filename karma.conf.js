var karmaUtils = require('elastic-apm-js-core/dev-utils/karma.js')
var testUtils = require('elastic-apm-js-core/dev-utils/test.js')

module.exports = function (config) {
  config.set(karmaUtils.baseConfig)
  var customeConfig = {
    globalConfigs: {
      useMocks: false,
      agentConfig: {
        serverUrl: 'http://localhost:8200',
        serviceName: 'test'
      }
    },
    testConfig: testUtils.getTestEnvironmentVariables()
  }
  if (customeConfig.testConfig.sauceLabs) {
    customeConfig.globalConfigs.useMocks = true
  }
  console.log('customeConfig:', customeConfig)
  config.set(customeConfig)
  var cfg = karmaUtils.prepareConfig(config)
  config.set(cfg)
}
