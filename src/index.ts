import {runRequest, type PM} from './requests';
import { AxiosRequestConfig, AxiosResponse, AxiosResponseHeaders } from 'axios';
import axios from 'axios';
import { Moment } from 'moment';
import {v4 as uuidv4} from 'uuid';
import {fdObj, setVariables} from './requests/fd';

declare module "axios" {
  export interface AxiosRequestConfig {
    // custom properties 
    metadata: {
      startTime: Date,
      endTime?: Date,
    };
  }
  export interface AxiosResponse {
    // custom properties 
    duration?: number;
  }
}

interface ExtendedAxiosResponse extends AxiosResponse {
  _id: string,
  requestId: string, //was itemId
  url?: string,
  data: {
    language: string,
    prettified: boolean,
    raw: string
  },
  tests?: {[test: string]: string}
  scriptError?: string
  error?: {
    event: string, //'Tests Sript'
    type: 'error' | 'info', //'error'
    message: string
  }
}

type Event = {
  listen: string, // test or 
  type: 'text/javascript',
  script: {
    exec: string[]
  }
}

type Request = {
  _id: string,
  order: string[],
  parentId: '' | string,
  parentType: '' | string,
  name: '' | string,
  events: Event[],
  request: {
    settings?: {
      readTimeout: number,
      connectTimeout: number,
    },
    auth?: {
      username: string,
      password: string,

    },
    body?: {
      mode: 'raw',
      raw: '',
      options: {
        raw: {
          language: 'json' | 'xml'
        }
      }
    },
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT',
    header?: {key: string, value: string}[],
    url: {
      host: string[],
      path: string[],
      raw: '',
      query: []
    },
    description?: string,
  }
}

// interface Envoronment {
//   scope: "environments" | 'globals' | 
// }

interface logRecord {
  action: "SET_LOG_RECORD" | "SET_RUNNING_ITEM" | "ADD_CONSOLE_RECORD" | "START_RUN", 
  args: {
    time?: Moment, 
    runId?: string, 
    colId?: string | null, 
    reqId?: string, 
    error?: ExtendedAxiosResponse['error'], 
    status?: string | null, 
    colName?: string, 
    request?: Request | AxiosRequestConfig, 
    tests?: {[test: string]: string}, 
    passed?: number, 
    failed?: number, 
    duration?: number, 
    url?: string,
    type?: 'log' | 'info' | 'error' | 'warn' | 'debug' | 'trace',
    message?: string | unknown,
    response?: {
      responseHeaders?: AxiosResponseHeaders,
      responseBody?: {
        language: string,
        prettified: boolean,
        raw: string
      },
      responseStatus?: number,
      responseDuration?: number // from interceptor
    },
  }
}
axios.interceptors.request.use(function (config: AxiosRequestConfig) {
  config.metadata = {startTime: new Date()};
  return config;
}, function (error) {
  return Promise.reject(error);
});
axios.interceptors.response.use(function (response: AxiosResponse): AxiosResponse {
  response.config.metadata.endTime = new Date()
  response.duration = response.config.metadata.endTime.getTime() - response.config.metadata.startTime.getTime()
  return response
}, function (error) {
  if (typeof error.config === 'undefined') {
    return Promise.reject(error)
  }
  error.config.metadata.endTime = new Date()
  error.duration = error.config.metadata.endTime.getTime() - error.config.metadata.startTime.getTime()
  return Promise.reject(error)
})
//SET_LOG_RECORD (state, {runId, colId, reqId, error, status, colName, request, tests, passed, failed, duration, url})

// (environmentId && item.scope === 'environments') {
//   Object.keys(item.variables).forEach((key) => {
//     if (!state.environments[environmentId]) {
//       // Vue.set(state.environments, environmentId, {})
//       state.environments[environmentId] = {}
//     }
//     // Vue.set(state.environments[environmentId], key, item.variables[key])
//     state.environments[environmentId][key] = item.variables[key]
//   })
// const setEnvironment = ({[test: string]: string}) => {

// }

const getResponse = async function (pm: PM, request: Request, runId: string, colId: string, logCb: (args: logRecord) => void): Promise<{failed: number, passed: number}> {
  let passed = 0
  let failed = 0
  // under development
  const response = await runRequest(colId, request, pm, logCb, undefined) as ExtendedAxiosResponse
  if (response && typeof response.tests !== 'undefined') {
    Object.keys(response.tests).forEach((key) => {
      if (response.tests && response.tests[key]) {
        passed = passed + 1
      } else {
        failed = failed + 1
      }
    })
  }
  
  logCb({action: 'SET_LOG_RECORD', args: {runId,
    colId,
    reqId: request?._id,
    request: request,
    url: response.url,
    tests: response.tests,
    error: response.error,
    failed,
    passed,
    duration: response.duration || undefined,
    status: response.status ? `${response.status} ${response.statusText || (response.status >= 200 && response.status < 300 ? 'OK' : '')}` : null }});
    return {passed, failed}
}
//action: string, props: {runId: string, colId: string, passed: number, failed: number}
const runCollection = function (runId: string, pm: PM, colId: string, getCollection: (colId: string) => any, 
  getRequests: (arg: string) => Promise<Request[]>,
  cancelExec: boolean,
  logCb: (args: logRecord) => void,
  ): Promise<{passed: number, failed: number}> {
  return new Promise<{passed: number, failed: number}>((resolve, reject) => {
    const collection = getCollection(colId) //async ?
    let failed = 0
    let passed = 0
    // commit('SET_LOG_RECORD', {runId, colId, colName: collection.name})
    getRequests(collection.order).then((requests) => {
      // console.log('length of requests', requests.length)
      if (requests.length === 0) {
        resolve({failed, passed})
      }
      requests.reduce(
        (p, x) =>
          p.then(_ => {
            // console.log('cancelExec status', cancelExec)
            if (cancelExec) {
              return Promise.resolve()
            }
            return getResponse(pm, x, runId, colId, logCb).then((tests) => {
              if (tests) {
                failed = tests.failed + failed
                passed = tests.passed + passed
              }
            })
          }
          ),
        Promise.resolve()
      ).then(() => {
        // commit('SET_LOG_RECORD', {runId, colId, failed, passed})
        logCb({action: 'SET_LOG_RECORD', args: {runId, colId, failed, passed}});
        resolve({failed, passed})
      }).catch((err) => {
        reject(err)
      });
    });
  });
}

const createRun = (environmentId: string, envVariables: object, collectionIds: string[], getCollection: (colId: string) => any, getRequests: (arg: string) => Promise<Request[]>, logCb: (params: logRecord) => void): {runId: string, cancel: () => void, exec: () => Promise<string>} => {
  let cancelExec = false
  // setVariables({environmentId: string: updates: [{scope: "environments", variables: envVariables}]});
  setVariables({collectionId: undefined, environmentId, updates: [{scope: "environments", variables: envVariables}]});
  const pm = fdObj();
  pm.tests = {};
  const runId = uuidv4()
  logCb({action: 'START_RUN', args: {runId}});
  const cancel = () => {
    cancelExec = true
  }
  const exec = () => {
    return new Promise<string>((resolve, reject) => {
      // const runId = uuidv4()
      let failed = 0
      let passed = 0
      // run collections sequentially
      collectionIds.reduce(
        (p: Promise<void>, x: string) =>
          p.then(() => {
            // commit('SET_RUNNING_ITEM', {runId, colId})
            logCb({action: 'SET_RUNNING_ITEM', args: {runId, colId: x}});
            runCollection(runId, pm, x, getCollection, getRequests, cancelExec, logCb).then((tests: { failed: number; passed: number }) => {
              if (tests) {
                failed = tests.failed + failed
                passed = tests.passed + passed
              }
            })
          }),
        Promise.resolve()
      ).then(() => {
        logCb({action: 'SET_RUNNING_ITEM', args: {runId, colId: null}});
        resolve(runId as string)
      }).catch((err) => {
        reject(err)
      })
    });
  };
  return { runId, cancel, exec }
}

export { createRun, runRequest, Request, ExtendedAxiosResponse, Event, logRecord, axios, fdObj as fidelizer }
