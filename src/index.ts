// // eslint-disable-next-line
// import ldap, { Client, SearchOptions, SearchEntryObject } from "ldapjs";
// import { NextFunction, Response } from 'express';
// // eslint-disable-next-line
// type Params = {
//   ldap_url: string,
//   ldap_user: string,
//   ldap_password: string,
//   tlsOptions: {
//     rejectUnauthorized: boolean,
//     reconnect: boolean
//   },
//   connectTimeout: number,
//   captureException?: typeof EXCEPTION,
//   roles?: Role,
//   idleTimeout?: number,
// }

// // type User = {
// //   username: string,
// //   memberOf: string[],
// //   employeeID?: string,
// //   userPrincipalName: string,
// //   controls?: any[],
// //   mail?: string,
// //   dn?: string,
// //   roles?: object 
// // };
// // type CallbackFunction = (err?: Error, result?: boolean) => void;

// let LDAP_PARAMS: Params
// let ACTIVE_SESSIONS = 0 as number

// type Role = {
//   [key: string]: string[];
// }

// const LOG = (msg: string) => {
//   console.log('LDAP:', msg)
//   // console.log("", err)
// };
// const EXCEPTION = (err: Error) => {
//   console.log('Exception error', err)
//   // console.log("", err)
// };

// // const ROLES = [] as Role[];

// type Indexed = {
//   [key: string]: any;
// };

const sample = () => {
  return "result"
}

// const init = (params: Params) => {
//   LDAP_PARAMS = params as Params;
//   if (!LDAP_PARAMS.idleTimeout) {
//     LDAP_PARAMS.idleTimeout = 60000;
//   }
//   connect().then((client) => {
//     // LOG("ldap params valid.");
//     disconnect(client);
//   }).catch((err) => {
//     EXCEPTION(err);
//   })
// }

// const createClient = async (params: Params) => {
//   const ldap_client: Client = ldap.createClient({
//     url: params.ldap_url,
//     tlsOptions: params.tlsOptions || {rejectUnauthorized: false, reconnect: true},
//     connectTimeout: params.connectTimeout || 5000,
//   });
//   try {
//     await new Promise<void> ((resolve, reject) => {
//       ldap_client.on('connect', () => {
//         ACTIVE_SESSIONS = ACTIVE_SESSIONS + 1
//         return resolve();
//       }).on('error', (err: Error) => {
//         return reject(err)
//       }).on('close', () => {
//         ACTIVE_SESSIONS = ACTIVE_SESSIONS - 1
//       });
//     })
//     return await Promise.resolve(ldap_client as Client);
//   } catch (err) {
//     // disconnect(ldap_client);
//     ldap_client.destroy();
//     return Promise.reject(err);
//   }
// }

// const bind = (params: Params, client: Client) => {
//   return new Promise<void>((resolve, reject) => {
//     if (client.connected) {
//       client.bind(params.ldap_user, params.ldap_password, (err) => {
//         if (err) {
//           client.destroy();
//           return reject(err);
//         }
//         resolve();
//       });
//     } else {
//       client.destroy();
//       reject(new Error ("LDAP client not found"));
//     }
//   })
// }

// const disconnect = (client: Client) => {
//   return new Promise<Client>((resolve, reject) => {
//     if (client && client.connected) {
//       client.unbind((err: any) => {
//         if (err) {
//           client.destroy();
//           return reject(err);
//         }
//         client.destroy();
//         resolve(client);
//       })
//     } else if (client) {
//       client.destroy();
//       resolve(client);
//     } else {
//       resolve(client);
//     }
//   });
// }

// const connect = async () => {
//   try {
//     const client = await createClient(LDAP_PARAMS);
//     await bind(LDAP_PARAMS, client)
//     return Promise.resolve(client)
//   } catch (err: any) {
//     EXCEPTION(err);
//     return Promise.reject(new Error ('LDAP service is not connected'))
//   }
// }

// const getLdapUser = async (username: string) => {
//   const client = await connect();
//   try {
//     const user = await searchLdapUser(username, client).catch((err) => {
//       throw err
//     }) as SearchEntryObject;
//     // For next LDAP versions
//     // const userPrincipalName = userEntry.attributes?.find(a => a.type === 'userPrincipalName')?.values?.at(0);
//     // const user = {} as User;
//     // if (userPrincipalName) {
//     //   user.userPrincipalName = userPrincipalName;
//     //   user.memberOf = userEntry.attributes?.find(a => a.type === 'memberOf')?.values || [];
//     //   user.employeeID = userEntry.attributes?.find(a => a.type === 'employeeID')?.values?.at(0) || '';
//     //   user.mail = userEntry.attributes?.find(a => a.type === 'mail')?.values?.at(0) || '';
//     //   user.dn = userEntry.objectName;
//     //   user.controls = userEntry.controls;
//     // } else {
//     //   throw new Error('Unexpected LDAPs response');
//     // }
//     return Promise.resolve(user);
//   } catch (err: any) {
//     return Promise.reject(err);
//   } finally {
//     disconnect(client);
//   }
// }

// const searchLdapUser = (username: string, client: Client) => {
//   return new Promise((resolve, reject) => {
//     const filter = `sAMAccountName=${username}`;
//     const opts = {
//       filter: `(&(objectCategory=Person)(${filter}))`,
//       scope: 'sub',
//       attributes: ['userPrincipalName', 'memberOf', 'employeeID', 'mail']
//     } as SearchOptions;
//     return client.search('dc=energo,dc=lv', opts, (err, resp) => {
//       if (err) {
//         return reject(err);
//       }
//       const entries = [] as SearchEntryObject[];
//       resp.on('searchEntry', (entry) => {
//         if (entry) {
//           entries.push(entry.object);
//         }
//       });
//       resp.on('error', (error) => {
//         reject(error)
//       });
//       resp.on('end', async (con) => {
//         if ((entries.length === 0 && username) || entries.length > 1 || con!.status) {
//           return reject(new Error("Incorrect username or password"));
//         }
//         resolve(entries[0]);
//       });
//     });
//   })
// }

// const bindUser = (userPrincipalName: string, password: string, response: Response, client: Client) => {
//   return new Promise((resolve, reject) => {
//     client.bind(userPrincipalName, password, (err: any) => {
//       if (err) {
//         disconnect(client);
//       }
//       if (err && (err.lde_message?.includes('DSID-0C090447') 
//         || err.lde_message?.includes('DSID-0C090449') 
//         || err.lde_message.includes('Credentials'))) {
//         response.statusCode = 403
//         // InvalidCredentialsError: 80090308: LdapErr: DSID-0C090447, comment: AcceptSecurityContext error, data 52e, v3839
//         return reject(new Error("Incorrect username or password"))
//       }
//       if (err && err.lde_message) {
//         response.statusCode = 403
//         return reject(new Error(err.lde_message))
//       }
//       if (err) {
//         response.statusCode = 500

//         return reject(err)
//       }
//       return resolve(true);
//     });
//   })
// }

// const setRoles = (request: Indexed): void => {
//   if (LDAP_PARAMS.roles && Object.keys(LDAP_PARAMS.roles).length > 0) {
//     request.ldap_user.roles = {}
//     Object.keys(LDAP_PARAMS.roles).forEach((key) => {
//       request.ldap_user.roles[key] = LDAP_PARAMS?.roles![key].some((roleGroup: string) => {
//         return request.ldap_user.memberOf.some((groupName: string) => {
//           return groupName.includes(roleGroup)
//         })
//       })
//     })
//     delete request.ldap_user.memberOf
//   }
// }

// const validateRequest =  (request: Indexed, response: Response) => {
//   if (typeof request.body.username === 'undefined' 
//     || typeof request.body.password === 'undefined' 
//     || request.body.username.length < 4 
//     || request.body.password.length < 6) {
//       response.statusCode = 403
//       throw new Error("Incorrect username or password")
//     }
// }

// const authenticate = async (request: Indexed, response: Response, next: NextFunction) => {
//     try {
//       validateRequest(request, response)
//       const client = await connect();
//       const user = await searchLdapUser(request.body.username, client).catch((err) => {
//         disconnect(client);
//         response.statusCode = 403
//         throw err
//       }) as SearchEntryObject;
//       const userPrincipalName = Array.isArray(user.userPrincipalName) ? user.userPrincipalName[0] : user.userPrincipalName as string
//       // For next LDAP versions
//       // const user = {} as User;
//       // const userPrincipalName = userEntry.attributes?.find(a => a.type === 'userPrincipalName')?.values?.at(0);
//       // if (userPrincipalName) {
//       //   user.userPrincipalName = userPrincipalName;
//       //   user.memberOf = userEntry.attributes?.find(a => a.type === 'memberOf')?.values || [];
//       //   user.employeeID = userEntry.attributes?.find(a => a.type === 'employeeID')?.values?.at(0) || '';
//       //   user.mail = userEntry.attributes?.find(a => a.type === 'mail')?.values?.at(0) || '';
//       //   user.dn = userEntry.objectName;
//       //   user.controls = userEntry.controls;
//       // } else {
//       //   throw new Error('Unexpected LDAPs response');
//       // }
//       await bindUser(userPrincipalName, request.body.password, response, client)
//       request.ldap_user = {...user, username: request.body.username}
//       setRoles(request);
//       disconnect(client);
//       next();
//     } catch (err: any) {
//       next(err);
//     }
// };


export { sample }
