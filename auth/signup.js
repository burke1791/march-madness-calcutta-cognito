import { callbackWaitsForEmptyEventLoopFalse } from '../utilities/common';
import sql from 'mssql';
const connection = require('../utilities/db').connection;

export async function addUserAfterSignup(event, context, callback) {
  callbackWaitsForEmptyEventLoopFalse(context);

  console.log(event.request.userAttributes);

  let email = event.request.userAttributes.email;
  let username = event.request.userAttributes.preferred_username;
  let cognitoSub = event.request.userAttributes.sub;

  if (!connection.isConnected) {
    await connection.createConnection();
  }

  const request = new sql.Request();
  request.input('Email', sql.VarChar(256), email);
  request.input('Username', sql.VarChar(50), username);
  request.input('CognitoSub', sql.VarChar(256), cognitoSub);

  try {
    await request.execute('dbo.up_AddUserAfterSignup');

    callback(null, event);
  } catch (error) {
    console.log(error);
    callback(null, event);
  }
}