import { callbackWaitsForEmptyEventLoopFalse } from '../utilities/common';
import sql from 'mssql';
const connection = require('../utilities/db').connection;

export async function syncUserInDatabase(event, context, callback) {
  callbackWaitsForEmptyEventLoopFalse(context);

  let email = event.request.userAttributes.email;
  let alias = event.request.userAttributes.preferred_username;
  let cognitoSub = event.request.userAttributes.sub;

  if (!connection.isConnected) {
    await connection.createConnection();
  }

  const request = new sql.Request();

  request.input('Email', sql.VarChar(256), email);
  request.input('Alias', sql.VarChar(50), alias);
  request.input('CognitoSub', sql.VarChar(256), cognitoSub);

  try {
    await request.execute('dbo.up_SyncUserWithCognito');
  } catch (error) {
    console.log(error);
  }

  callback(null, event);
}