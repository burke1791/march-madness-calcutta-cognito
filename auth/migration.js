import AWS from 'aws-sdk';
import { callbackWaitsForEmptyEventLoopFalse } from '../utilities/common';

const oldUserPoolConfig = {
  CLIENT_ID: process.env.OLD_COGNITO_CLIENT_ID,
  USER_POOL_ID: process.env.OLD_USER_POOL_ARN,
  REGION: 'us-east-1'
};

export async function migrateUser(event, context, callback) {
  callbackWaitsForEmptyEventLoopFalse(context);

  let username = event.userName;
  let password = event.request.password;

  let result = await migrationAuthentication(username, password);

  console.log(result);

  callback(null, 'Bad password');
}

async function migrationAuthentication(username, password) {
  const cisp = new AWS.CognitoIdentityServiceProvider();

  try {
    const resAuth = await cisp.adminInitiateAuth({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      },
      ClientId: oldUserPoolConfig.CLIENT_ID,
      UserPoolId: oldUserPoolConfig.USER_POOL_ID
    }).promise();

    console.log(resAuth);

    if (resAuth.code && resAuth.message) {
      return undefined;
    }

    const resGet = await cisp.adminGetUser({
      UserPoolId: oldUserPoolConfig.USER_POOL_ID,
      Username: username
    }).promise();

    console.log(resGet);

    if (resGet.code && resGet.message) {
      return resGet.UserAttributes;
    }
  } catch (error) {
    console.log(error);
  }

  return undefined
}