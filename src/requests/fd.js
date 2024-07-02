import Moment from 'moment';
import xml2js from 'xml-js';

const state = {
  collections: {},
  environments: {},
  globals: {},
  loading: {
    status: false,
    token: null
  },
  currentCollectionId: null,
  currentEnvironmentId: null,
}

const setCurrentCollection = (collectionId) => {
  state.currentCollectionId = collectionId;
}
const setCurrentEnvironment = (environmentId) => {
  state.currentEnvironmentId = environmentId;
}

const setVariables = ({collectionId, environmentId, updates}) => {
  // Your code here
  updates.forEach((item) => {
    if (item.scope === 'collections') {
      Object.keys(item.variables).forEach((key) => {
        if (!state.collections[collectionId]) {
          // Vue.set(state.collections, collectionId, {})
          state.collections[collectionId] = {}
        }
        // Vue.set(state.collections[collectionId], key, item.variables[key])
        state.collections[collectionId][key] = item.variables[key]
      })
    } else if (item.scope === 'globals') {
      Object.keys(item.variables).forEach((key) => {
        // Vue.set(state.globals, key, item.variables[key])
        state.globals[key] = item.variables[key]
      })
    } else if (environmentId && item.scope === 'environments') {
      Object.keys(item.variables).forEach((key) => {
        if (!state.environments[environmentId]) {
          // Vue.set(state.environments, environmentId, {})
          state.environments[environmentId] = {}
        }
        // Vue.set(state.environments[environmentId], key, item.variables[key])
        state.environments[environmentId][key] = item.variables[key]
      })
    }
  })
};

const fdObj = function () {
  // console.log('Test', getters.envVariables)
  return {
  //   sendRequest (options, callback) {
  //     this.reqTasks.push({options, callback})
  //   },
    moment (input) {
      //const moment = require('moment')
      const moment = Moment;
      return moment(input);
    },
    xml2Json (xml) {
      const convert = xml2js;
      // console.log('before xml2Json', convert.xml2js(xml, {compact: true, spaces: 0, ignoreDeclaration: true}))
      const transformObj = (obj) => {
        if (typeof obj === 'object' && !Array.isArray(obj)) {
          const newObj = {}
          if (obj._text) {
            return obj._text
          }
          Object.keys(obj).forEach((key) => {
            newObj[key] = transformObj(obj[key])
          })
          return newObj
        } if (typeof obj === 'object' && Array.isArray(obj)) {
          const newObj = []
          for (let i = 0; i < obj.length; i += 1) {
            newObj.push(transformObj(obj[i]))
          }
          return newObj
        }
        return obj
      }
      try {
        return transformObj(convert.xml2js(xml, {compact: true, spaces: 0, ignoreDeclaration: true}))
      } catch (err) {
        return ''
      }
    },
    response: {
      set (response) {
        // console.log('setResponse', response)
        this.responseBody = response.data.raw
        this.responseHeaders = response.headers
        this.responseCode = {
          code: response.status,
          text: response.statusText
        }
        this.responseTime = response.duration
      },
      json () {
        return JSON.parse(this.responseBody)
      },
      text () {
        return this.responseBody
      },
      // raw: '',
      // format: '',
      responseCode: {}, // responseCode.code
      responseBody: '',
      responseHeaders: {},
      responseTime: undefined
      // xml2Json(responseBody)
    },
    globals: {
      set (name, value) {
        this.modifiedVariables[name] = value
      },
      get (name) {
        // console.log('test', this)
        return this.modifiedVariables[name] || this.variables[name]
      },
      variables: state.globals,
      modifiedVariables: {}
    },
    collectionVariables: {
      set (name, value) {
        this.modifiedVariables[name] = value
      },
      get (name) {
        return this.modifiedVariables[name] || this.variables[name]
      },
      variables: state.collections[state.currentCollectionId]|| {},
      modifiedVariables: {}
    },
    currentEnvironment: {id: state.currentEnvironmentId} || {},
    environment: {
      set (name, value) {
        this.modifiedVariables[name] = value
      },
      get (name) {
        return this.modifiedVariables[name] || this.variables[name]
      },
      variables: state.environments[state.currentEnvironmentId] || {},
      modifiedVariables: {}
    },
    variables: {
      get (name) {
        return this.parent.environment.get(name) || this.parent.collectionVariables.get(name) || this.parent.globals.get(name)
      }
    },
    tests: {},
    abort: false, // wslab feature to skip executing
    reqTasks: [],
    init: function () {
      delete this.init
      this.variables.parent = this
      return this
    }
  }.init();
}

export { fdObj, state, setCurrentCollection, setCurrentEnvironment, setVariables }