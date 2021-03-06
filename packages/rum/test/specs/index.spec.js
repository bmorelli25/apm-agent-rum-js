/**
 * MIT License
 *
 * Copyright (c) 2017-present, Elasticsearch BV
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

const { apmBase } = require('../../src/')
const apmCore = require('@elastic/apm-rum-core')
const { getGlobalConfig } = require('../../../../dev-utils/test-config')

const { globalConfigs } = getGlobalConfig()

describe('index', function() {
  var originalTimeout

  beforeEach(function() {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000
  })

  afterEach(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
  })

  it('should init ApmBase', function(done) {
    var apmServer = apmBase.serviceFactory.getService('ApmServer')
    if (globalConfigs && globalConfigs.useMocks) {
      apmServer._makeHttpRequest = function() {
        return Promise.resolve()
      }
    }

    spyOn(apmServer, 'sendErrors').and.callThrough()
    spyOn(apmServer, '_postJson').and.callThrough()

    try {
      throw new Error('ApmBase test error')
    } catch (error) {
      apmBase.captureError(error)
      if (apmCore.utils.isPlatformSupported()) {
        expect(apmServer.errorQueue).toBeUndefined()
        expect(apmServer.sendErrors).not.toHaveBeenCalled()
        expect(apmServer._postJson).not.toHaveBeenCalled()
      }
    }
    const { agentConfig } = globalConfigs
    apmBase.init({
      serverUrl: agentConfig.serverUrl,
      serviceName: agentConfig.serviceName,
      flushInterval: 100
    })

    apmBase.setUserContext({
      usertest: 'usertest',
      id: 'userId',
      username: 'username',
      email: 'email'
    })
    apmBase.setCustomContext({ testContext: 'testContext' })
    apmBase.addTags({ testTagKey: 'testTagValue' })

    try {
      throw new Error('ApmBase test error')
    } catch (error) {
      apmBase.captureError(error)
      expect(apmServer.sendErrors).not.toHaveBeenCalled()
      if (apmCore.utils.isPlatformSupported()) {
        expect(apmServer.errorQueue.items.length).toBe(1)
        setTimeout(() => {
          expect(apmServer.sendErrors).toHaveBeenCalled()
          var callData = apmServer.sendErrors.calls.mostRecent()
          callData.returnValue.then(
            () => {
              // Wait before ending the test to make sure the result are processed by the agent.
              // Karma changes the iframe src when the tests finish and Chrome would cancel any
              // request that was made by an iframe that got removed or had it's src changed
              // and the agent would recieved http status 0
              setTimeout(() => {
                done()
              }, 100)
            },
            reason => {
              fail('Failed sending error:', reason)
            }
          )
        }, 200)
      } else {
        done()
      }
    }
  })
})
