// require('dotenv').config();
// import { Client, type SearchEntryObject } from "ldapjs";
// import { NextFunction, Request, Response } from 'express';
// declare module "express" {
//   export interface Request {
//     // eslint-disable-next-line
//     ldap_user: any
//   }
// }
// import { authenticate, init, createClient, disconnect, connect, getLdapUser, ACTIVE_SESSIONS } from "../index"


// const ldapUrl = process.env.LDAP_URL || ''
// const ldapUser = process.env.LDAP_USER || ''
// const ldapPass = process.env.LDAP_PASSWORD || ''
// const authUser = process.env.AUTH_USERNAME || ''
// const authPassword =  process.env.AUTH_PASSWORD || ''

// function timeout(ms: number) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// const validInit = () => {
//   init({
//     ldap_url: ldapUrl,
//     ldap_user: ldapUser,
//     ldap_password: ldapPass,
//     tlsOptions: { rejectUnauthorized: false, reconnect: false },
//     connectTimeout: 3000,
//     })
// }


// describe('LDAP authenticate middleware', () => {
//   let mockRequest: Partial<Request>;
//   let mockResponse: Partial<Response>;
//   const nextFunction: NextFunction = jest.fn();

//   beforeEach(() => {
//     mockRequest = {};
//     mockResponse = {
//       json: jest.fn(),
//     };
//   });

//   afterEach(async() => {
//     jest.clearAllMocks();
//     // await timeout(1000);
//   });

//   test('createClient method initialized with incorrect url returns timeout error', async () => {
//     try {
//       await createClient({
//         ldap_url: ldapUrl,
//         ldap_user: ldapUser,
//         ldap_password: ldapPass,
//         tlsOptions: { rejectUnauthorized: false, reconnect: false },
//         connectTimeout: 5,
//         });

//     } catch (err: any) {
//       expect(err.toString()).toMatch(/(ConnectionError|connectRefused|getaddrinfo)/i)
//     }
//   });

//   test('ldap client connected and disconnected successfuly', async () => {
//     validInit();
//     let client = await connect();
//     expect(client.connected).toBe(true);
//     client = await disconnect(client as Client);
//     expect(client.connected).toBe(false);
//   });

//   test('createClient initialized with incorrect url returns timeout error', async () => {
//     try {
//       await createClient({
//         ldap_url: "ldaps://leports.energo.lv:636",
//         ldap_user: "ldapUser",
//         ldap_password: "ldapPass",
//         tlsOptions: {
//           rejectUnauthorized: false,
//           reconnect: false
//         },
//         connectTimeout: 1
//       });
//     } catch (err: any) {
//       expect(err.toString()).toMatch(/(ConnectionError|connectRefused|getaddrinfo)/i)
//     }
//   });

//   test('function getLdapUser returns ldap user data', async () => {
//     validInit()
//     const user = await getLdapUser(authUser) as SearchEntryObject
//     expect(user.userPrincipalName).toBe("gatis.linters@latvenergo.lv")
//   });

//   test('authenticate with valid credentials', async () => {
//     validInit()
//     mockRequest = {
//       body: {
//         'username': authUser,
//         'password': authPassword
//       }
//     };
//     await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
//     expect(mockRequest.ldap_user.username).toBe(authUser)
//     expect(mockRequest.ldap_user).toHaveProperty("memberOf")
//     expect(nextFunction).toBeCalledTimes(1);
//   });

//   test('authenticate with invalid password', async () => {
//     validInit()
//     const expectedError = new Error("Incorrect username or password")
//     mockRequest = {
//       body: {
//         'username': authUser,
//         'password': 'incorrect'
//       }
//     };
//     await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
//     expect(mockResponse.statusCode).toBe(403)
//     expect(nextFunction).toBeCalledTimes(1);
//     expect(nextFunction).toBeCalledWith(expectedError)
//   });

//   test('authenticate with blank password', async () => {
//     validInit()
//     const expectedError = new Error("Incorrect username or password")
//     mockRequest = {
//       body: {
//         'username': authUser,
//         'password': ''
//       }
//     };
//     await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
//     expect(mockResponse.statusCode).toBe(403)
//     expect(nextFunction).toBeCalledTimes(1);
//     expect(nextFunction).toBeCalledWith(expectedError)
//   });

//   test('authenticate without password', async () => {
//     validInit()
//     const expectedError = new Error("Incorrect username or password")
//     mockRequest = {
//       body: {
//         'username': authUser
//       }
//     };
//     await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
//     expect(mockResponse.statusCode).toBe(403)
//     expect(nextFunction).toBeCalledTimes(1);
//     expect(nextFunction).toBeCalledWith(expectedError)
//   });

//   test('authenticate with invalid user and password', async () => {
//     validInit()
//     const expectedError = new Error("Incorrect username or password")
//     mockRequest = {
//       body: {
//         'username': 'not_exist',
//         'password': 'incorrect'
//       }
//     };
//     await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
//     expect(mockResponse.statusCode).toBe(403)
//     expect(nextFunction).toBeCalledTimes(1);
//     expect(nextFunction).toBeCalledWith(expectedError)
//   });

//   test('authenticate with valid credentials and with roles option enabled', async () => {
//     init({
//       ldap_url: ldapUrl,
//       ldap_user: ldapUser,
//       ldap_password: ldapPass,
//       tlsOptions: { rejectUnauthorized: false, reconnect: false },
//       connectTimeout: 3000,
//       // captureException: typeof Error,
//       roles: {
//         "admin":  ["PowerOn_Admin"],
//         "user":  ["PowerOn_User"]
//         }
//       })
//     mockRequest = {
//       body: {
//         'username': authUser,
//         'password': authPassword
//       }
//     };
//     await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
//     expect(mockRequest.ldap_user.username).toBe(authUser)
//     expect(mockRequest.ldap_user.memberOf).toBe(undefined)
//     expect(mockRequest.ldap_user).toHaveProperty("roles")
//     expect(mockRequest.ldap_user.roles.admin).toBe(true)
//     expect(nextFunction).toBeCalledTimes(1);
//   });

//   test('active sessions must be zero', async () => {
//     // to wait async disconnect
//     await timeout(1000);
//     expect(ACTIVE_SESSIONS).toBe(0)
//   });

// })
