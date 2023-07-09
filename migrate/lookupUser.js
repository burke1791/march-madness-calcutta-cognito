import AWS from 'aws-sdk';
import { callbackWaitsForEmptyEventLoopFalse } from '../utilities/common';

const userPoolConfig = {
  CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  USER_POOL_ID: process.env.USER_POOL_ID,
  REGION: 'us-east-1'
};

export async function lookupUser(event, context, callback) {
  callbackWaitsForEmptyEventLoopFalse(context);
  const cisp = new AWS.CognitoIdentityServiceProvider({ region: 'us-east-1' });

  const username = event.username;
  const password = event.password;

  console.log(username, password);

  try {
    const resAuth = await cisp.adminInitiateAuth({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      },
      ClientId: userPoolConfig.CLIENT_ID,
      UserPoolId: userPoolConfig.USER_POOL_ID
    }).promise();

    console.log(resAuth);

    if (resAuth.code && resAuth.message) {
      callback(null, null);
    }

    const resGet = await cisp.adminGetUser({
      UserPoolId: userPoolConfig.USER_POOL_ID,
      Username: username
    }).promise();

    console.log(resGet);

    if (resGet.code && resGet.message) {
      callback(null, null);
    }

    callback(null, {
      sub: resGet.UserAttributes.find(e => e.Name === 'sub').Value,
      email: resGet.UserAttributes.find(e => e.Name === 'email').Value,
      preferred_username: resGet.UserAttributes.find(e => e.Name === 'preferred_username').Value
    });
  } catch (error) {
    console.log(error);
    callback(null, error);
  }
}