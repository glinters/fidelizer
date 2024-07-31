import {type Request, type Event, type ExtendedAxiosResponse, type logRecord, axios} from '../index';
import {AxiosRequestHeaders, AxiosRequestConfig, AxiosResponseHeaders, CancelTokenSource} from 'axios'
// import axios from 'axios';
import { NodeVM } from 'vm2';
import moment, { Moment } from'moment';
import {fdObj, setVariables} from './fd';
import http from 'http';
import https from 'https';

interface PM {
  moment(input: any): Moment; 
  xml2Json(xml: any): any; 
  response: { 
     set(response: any): void;
     json(): any; 
     text(): string; 
     responseCode?: undefined | number; 
     responseBody: string; 
     responseHeaders: object; 
     responseTime: number | undefined; 
    },
  globals: {
    set (name: string, value: any): void;
    get (name: string): any;
    variables: object;
    modifiedVariables: object
  },
  collectionVariables: {
    set (name: string, value: any): void;
    get (name: string): any;
    variables: object;
    modifiedVariables: object
  },
  currentEnvironment: {id: string | null},
  environment: {
    set (name: string, value: any): void;
    get (name: string): any;
    variables: object;
    modifiedVariables: object
  },
  variables: {
    get (name: string): any;
  },
  tests: {[test: string]: string},
  abort: boolean, // wslab feature to skip executing
  reqTasks: any[],
}

const formatXml = (xml: string): string => {
  // return xml
  const PADDING = ' '.repeat(2)
  const reg = /(>)(<)(\/*)/g
  let pad = 0

  xml = xml.replace(reg, '$1\r\n$2$3')

  return xml.split('\r\n').map((node, index) => {
    let indent = 0
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0
    } else if (node.match(/^<\/\w/) && pad > 0) {
      pad -= 1
      // eslint-disable-next-line
    } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
      indent = 1
    } else {
      indent = 0
    }

    pad += indent

    return PADDING.repeat(pad - indent) + node
  }).join('\r\n')
}

const replaceVariables = (options: AxiosRequestConfig, pm: PM) => {
  // eslint-disable-next-line
  let tokenPattern = new RegExp('\{{(.*?)\}}', 'g')
  options.data = options.data ? options.data.replace(tokenPattern, function ($0: string, $1: string) {
    // console.log('oho', $0, $1)
    // console.log(getters.getPmObj.variables.get($1))
    return pm.variables.get($1)
  }) : options.data
  options.url = options.url ? options.url.replace(tokenPattern, function ($0: string, $1: string) {
    // console.log('oho', $0, $1)
    // console.log(getters.getPmObj.variables.get($1))
    return pm.variables.get($1)
  }) : options.url
  if (options.auth) {
    options.auth.username = options.auth.username.replace(tokenPattern, function ($0: string, $1: string) {
      // console.log('oho', $0, $1)
      // console.log(getters.getPmObj.variables.get($1))
      return pm.variables.get($1)
    })
    options.auth.password = options.auth.password.replace(tokenPattern, function ($0: string, $1: string) {
      // console.log('oho', $0, $1)
      // console.log(getters.getPmObj.variables.get($1))
      return pm.variables.get($1)
    })
  }
  if (typeof options.headers !== undefined) {
    for (const key of Object.keys(options.headers || {})) {
      console.log(`${key} is string: ${typeof options.headers?.[key] ==='string'}`)
      if (typeof options.headers?.[key] ==='string') {
        options.headers[key] = options?.headers?.[key]?.toString().replace(tokenPattern, function ($0: string, $1: string) {
          console.log(`${options.headers?.[key]} replaced with: ${pm.variables.get($1)}`);
          return pm.variables.get($1)
        })
      }
    }
  }
  return options
}

const setOptions = (req: Request, pm: PM, cancelTokenSource: CancelTokenSource | undefined): AxiosRequestConfig => {
  const options = {} as AxiosRequestConfig
  options.url = req.request?.url?.raw
  options.data = req.request?.body?.raw
  options.transformResponse = x => x
  options.validateStatus = () => true
  options.cancelToken = cancelTokenSource ? cancelTokenSource.token : undefined
  options.headers = req.request.header ? Object.assign({}, ...req.request.header.map(h => {
    const val = {} as AxiosRequestHeaders
    if (h.key && h.value) {
      val[h.key] = h.value
      return val
    } else {
      return h
    }
  })) : {} as AxiosRequestHeaders
  if (typeof options.headers !== 'undefined' && req.request.body?.options?.raw?.language === 'json') {
    options.headers['Content-Type'] = 'application/json'
  }
  if (req.request.auth && req.request.auth.username) {
    options.auth = {
      username: req.request.auth.username,
      password: req.request.auth.password
    }
  }
  if (req.request.settings && req.request.settings.readTimeout) {
    options.timeout = req.request.settings.readTimeout > 0 ? req.request.settings.readTimeout * 1000 : 0
  }
  if (req.request.settings && req.request.settings.connectTimeout && req.request.settings.connectTimeout > 0) {
    // console.log('set connect timeout')
    options.httpAgent = new http.Agent({ timeout: req.request.settings.connectTimeout * 1000 })
    options.httpsAgent = new https.Agent({ timeout: req.request.settings.connectTimeout, rejectUnauthorized: false })
  }
  options.method = req.request.method
  if (!options.httpsAgent) {
    options.httpsAgent = new https.Agent({ rejectUnauthorized: false })
  }
  // options.validateStatus = function (status) { return true }
  // options.transformResponse = [function (data) { return data }]
  // console.log('auth debug', options)
  return replaceVariables(options, pm)
}

const runScript = (logCb: (args: logRecord) => void, pm: PM, vm: NodeVM, code = '', callback: (err: unknown) => void) => {
    try {
      vm.run(code, 'moment')
    } catch (err) {
      logCb({action: 'ADD_CONSOLE_RECORD', args: {time: moment(), type: 'error', message: err}})
      return callback(err)
    }
    if (pm.reqTasks.length > 0) {
      pm.reqTasks.forEach((task, i) => {
        pm.reqTasks.splice(i, 1)
        axios.get(task.options).then(result => {
          runScript(logCb, pm, vm, task.callback(null, result), (err) => {
            callback(err)
          })
        }).catch((err) => {
          callback(err)
        })
      });
    } else {
      return callback(null);
    }
}

const mapLogRecords = (data: any): string => {
  return [...data].map((d) => {
    if (typeof d === 'object' && !Array.isArray(d)) {
      const obj = Object.assign({}, d)
      return JSON.stringify(obj)
    } else if (typeof d === 'object' && Array.isArray(d)) {
      return JSON.stringify(d)
    }
    return data
  }).join(' ')
}

const runScriptProcess = function (collectionId:string, event: Event | undefined, pm: PM, logCb: (args: logRecord) => void, response: ExtendedAxiosResponse | undefined): Promise<PM> {
  return new Promise((resolve, reject) => {
      // Wrap the code
      if (typeof event === 'undefined') {
        // return reject(new Error('event is undefined'));
        return resolve(pm)
      }
      const preCode = 'const {responseBody, responseCode, responseTime, responseHeaders} = pm.response; const {xml2Json, tests, moment, currentEnvironment} = pm;'

      const code = preCode + event.script.exec.join('\n')
      // const pm = fdObj() as PM; //PM = postman?!
      // pm.tests = {}
      // let tests = {}
      if (typeof response !== 'undefined') {
        pm.response.set(response)
      }
      const vm = new NodeVM({
        console: 'redirect',
        timeout: 10000,
        sandbox: {pm},
        require: {
          external: {
            modules: ['moment', 'xml-js']
          },
          root: '../../../../' // + '/node_modules'
          // modules: ['moment']
        }
      })
      vm.on('console.log', (...data) => {
        logCb({action: 'ADD_CONSOLE_RECORD', args: {time: moment(), type: 'log', message: mapLogRecords(data)}})
      })
      vm.on('console.info', (...data) => {
        logCb({action: 'ADD_CONSOLE_RECORD', args: {time: moment(), type: 'info', message: mapLogRecords(data)}})
      })
      vm.on('console.trace', (...data) => {
        logCb({action: 'ADD_CONSOLE_RECORD', args: {time: moment(), type: 'trace', message: mapLogRecords(data)}})
      })
      vm.on('console.warn', (data) => {
        logCb({action: 'ADD_CONSOLE_RECORD', args: {time: moment(), type: 'warn', message: data}})
      })
      vm.on('console.error', (data) => {
        logCb({action: 'ADD_CONSOLE_RECORD', args: {time: moment(), type: 'error', message: data}})
      })

      runScript(logCb, pm, vm, code, (err) => {
        const updates = []
        if (Object.keys(pm.globals.modifiedVariables).length > 0) {
          updates.push({scope: 'globals', variables: pm.globals.modifiedVariables})
        }
        if (Object.keys(pm.collectionVariables.modifiedVariables).length > 0) {
          updates.push({scope: 'collections', variables: pm.collectionVariables.modifiedVariables})
        }
        if (Object.keys(pm.environment.modifiedVariables).length > 0) {
          updates.push({scope: 'environment', variables: pm.environment.modifiedVariables})
        }
        // const collectionId = getters.active.collectionId
        setVariables({ updates, collectionId, environmentId: null });
        // commit('SET_VARIABLES', {updates, collectionId})
        if (pm.abort) {
          pm.abort = false
          reject(new Error('Request aborted'))
        }
        //
        if (err) {
          reject(err)
        } else {
          resolve(pm)
        }
      })
    })
  };


const runRequest = function (collectionId:string, request: Request, pm: PM | undefined, logCb: (args: logRecord) => void, cancelTokenSource: CancelTokenSource | undefined): Promise<Partial<ExtendedAxiosResponse>> {
    return new Promise((resolve) => {
      // if (typeof request === 'undefined') {
      //   return reject(new Error('Request Item not provided'))
      // }
      let event = request.events ? request.events.find(e => e.listen === 'prerequest') : undefined
      if (typeof pm === 'undefined') {
        pm = fdObj() as PM; //PM = postman?!
        pm.tests = {} 
      }
      // const pm = fdObj() as PM; //PM = postman?!
      runScriptProcess(collectionId, event, pm, logCb, undefined).then((pm) => {
        const preTests = pm.tests;
        const options = setOptions(request, pm, cancelTokenSource);
          axios(options).then(resp => {
            const response = resp as unknown as ExtendedAxiosResponse;
            response._id = request._id;
            response.url = options.url;
            response.requestId = request._id;
            // response.data = {prettified: false, raw: response.data}
            if (response.headers && response.headers['content-type']?.includes('xml')) {
              response.data = {prettified: true, raw: formatXml(resp.data.toString()), language: 'xml'};
            } else if (response.headers && response.headers['content-type']?.includes('html')) {
              response.data = {prettified: false, raw: resp.data.toString(), language: 'html'};
            } else if (response.headers && response.headers['content-type']?.includes('json')) {
              response.data = {prettified: false, raw: resp.data.toString(), language: 'json'};
            } else {
              response.data = {prettified: false, raw: resp.data.toString(), language: 'text'};
            }
            logCb({action: 'ADD_CONSOLE_RECORD', args: {time: moment(),
              type: 'log',
              message: '',
              request: options,
              response: {
                responseHeaders: response.headers as AxiosResponseHeaders,
                responseBody: response.data,
                responseStatus: response.status,
                responseDuration: response.duration // from interceptor
              }}});            
            event = request.events.find(e => e.listen === 'test');
            // dispatch('runScript', {event, response}).then((pm) => {
            runScriptProcess(collectionId, event, pm, logCb, response).then((pm) => {
              response.tests = { ...preTests, ...pm.tests }
              // console.log(response)
              resolve(response)
              // }, 1000)
            }).catch((err) => {
              response.scriptError = 'Post Sript Error: ' + err.message
              resolve(response)
            })
          }).catch((err) => {
            if (axios.isCancel(err)) {
              err.message = 'Request canceled'
              logCb({action: 'ADD_CONSOLE_RECORD', args: {
                time: moment(), type: 'log', message: 'Request canceled', request: request
              }});
            } else {
              console.error(err);
              // logCb({action: 'ADD_CONSOLE_RECORD', args: {
              //   time: moment(), type: 'error', message: err.message || 'Unexpected error', request
              // }});
            }
            resolve({
              _id: request._id,
              requestId: request._id,
              error: {
                event: 'Tests Sript',
                type: 'error',
                message: err.message
              },
              url: options.url
            });
          })
      }).catch((err) => {
        console.log(err)
        setTimeout(() => {
          resolve({
            _id: request._id,
            requestId: request._id,
            error: {
              event: 'Pre Request Sript',
              type: err.message === 'Request aborted' ? 'info' : 'error',
              message: err.message
            }
          })
        }, 500)
      })
    })
  }

export { runRequest, type PM }