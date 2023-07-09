import AWS from 'aws-sdk';
import { callbackWaitsForEmptyEventLoopFalse } from '../utilities/common';

const oldUserPoolConfig = {
  CLIENT_ID: process.env.OLD_COGNITO_CLIENT_ID,
  USER_POOL_ID: process.env.OLD_USER_POOL_ID,
  REGION: 'us-east-1'
};

export async function migrateUser(event, context, callback) {
  callbackWaitsForEmptyEventLoopFalse(context);

  let username = event.userName;
  let password = event.request.password;

  // const lambdaParams = {
  //   FunctionName:
  // }

  let user = await authenticateUser(username, password);

  if (user) {
    event.response.userAttributes = {
      email: user.email,
      email_verified: true,
      preferred_username: user.preferred_username
    };
    event.response.finalUserStatus = 'CONFIRMED';
    event.response.messageAction = 'SUPPRESS';

    return event;
  } else {
    callback(null, 'Bad Password');
  }
}

async function authenticateUser(username, password) {
  const cisp = new AWS.CognitoIdentityServiceProvider({ region: 'us-east-1' });
  const sts = new AWS.STS();

  try {
    const creds = sts.assumeRole({
      RoleArn: 'arn:aws:iam::329156245350:role/lambda-migrate-user'
    });

    console.log(creds);

    let resAuth = await cisp.adminInitiateAuth({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      },
      ClientId: oldUserPoolConfig.CLIENT_ID,
      UserPoolId: oldUserPoolConfig.USER_POOL_ID
    }).promise();

    if (resAuth.code && resAuth.message) {
      return undefined;
    }

    let resGet = await cisp.adminGetUser({
      UserPoolId: oldUserPoolConfig.USER_POOL_ID,
      Username: username
    }).promise();

    if (resGet.code && resGet.message) {
      return undefined;
    }

    return {
      sub: resGet.UserAttributes.find(e => e.Name === 'sub').Value,
      email: resGet.UserAttributes.find(e => e.Name === 'email').Value,
      preferred_username: resGet.UserAttributes.find(e => e.Name === 'preferred_username').Value
    };
  } catch (error) {
    console.log(error);
    return error;
  }
}