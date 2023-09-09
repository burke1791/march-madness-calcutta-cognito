import AWS from 'aws-sdk';
import { callbackWaitsForEmptyEventLoopFalse } from '../utilities/common';

const oldUserPoolConfig = {
  CLIENT_ID: process.env.OLD_COGNITO_CLIENT_ID,
  USER_POOL_ID: process.env.OLD_USER_POOL_ID,
  REGION: 'us-east-1'
};

const roleArn = 'arn:aws:iam::329156245350:role/lambda-migrate-user';

export async function migrateUser(event, context, callback) {
  callbackWaitsForEmptyEventLoopFalse(context);

  console.log(event);

  const username = event.userName;
  const password = event.request.password;

  try {
    const creds = await assumeRole(roleArn, 'migrate-user');
    if (creds === null) throw new Error('Unable to assume role');

    const cisp = initCisp(creds?.Credentials);
    if (cisp === null) throw new Error('Could not instantiate CognitoIdentityServiceProvider');

    if (event.triggerSource === 'UserMigration_Authentication') {
      const auth = await authenticateUser(username, password, cisp);
      if ((auth == null) || (auth.code && auth.message)) throw new Error('Could not authenticate');

      const user = await lookupUser(username, cisp);
      if ((user == null) || (user.code && user.message)) throw new Error('Unable to find user in pool');

      event.response.userAttributes = {
        email: String(user.UserAttributes.find(e => e.Name === 'email').Value).toLowerCase(),
        email_verified: true,
        preferred_username: user.UserAttributes.find(e => e.Name === 'preferred_username').Value
      };
      event.response.finalUserStatus = 'CONFIRMED';
      event.response.messageAction = 'SUPPRESS';
    } else if (event.triggerSource === 'UserMigration_ForgotPassword') {
      const user = await lookupUser(username, cisp);
      if ((user == null) || (user.code && user.message)) throw new Error('Unable to find user in pool');

      event.response.userAttributes = {
        email: user.UserAttributes.find(e => e.Name === 'email').Value,
        email_verified: true,
        preferred_username: user.UserAttributes.find(e => e.Name === 'preferred_username').Value
      };
      event.response.messageAction = 'SUPPRESS';
    }

    console.log(event);

    return event;
  } catch (error) {
    console.log(error);
    return event;
  }
}

async function assumeRole(roleArn, sessionName) {
  const sts = new AWS.STS();

  try {
    const creds = await sts.assumeRole({
      RoleArn: roleArn,
      RoleSessionName: sessionName
    }).promise();

    console.log(creds);

    return creds;
  } catch (error) {
    console.log(error);
    return null;
  }
}

function initCisp(creds) {
  try {
    if (!creds) throw new Error('Invalid creds');

    const cisp = new AWS.CognitoIdentityServiceProvider({
      region: 'us-east-1',
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretAccessKey,
      sessionToken: creds.SessionToken
    });

    return cisp;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function authenticateUser(username, password, cisp) {
  try {
    const auth = await cisp.adminInitiateAuth({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      },
      ClientId: oldUserPoolConfig.CLIENT_ID,
      UserPoolId: oldUserPoolConfig.USER_POOL_ID
    }).promise();

    console.log(auth);

    return auth;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function lookupUser(username, cisp) {
  try {
    const user = await cisp.adminGetUser({
      UserPoolId: oldUserPoolConfig.USER_POOL_ID,
      Username: username
    }).promise();

    console.log(user);

    return user;
  } catch (error) {
    console.log(error);
    return null;
  }
}


/*
async function authenticateUser2(username, password) {
  const sts = new AWS.STS();

  console.log('username', username);
  console.log('password', password);

  try {
    const assumedRole = await sts.assumeRole({
      RoleArn: 'arn:aws:iam::329156245350:role/lambda-migrate-user',
      RoleSessionName: 'migrate-user'
    }).promise();

    const creds = assumedRole?.Credentials;

    console.log(assumedRole);
    console.log(creds);

    if (creds == undefined) throw new Error('Credentials not acquired');

    const cisp = new AWS.CognitoIdentityServiceProvider({
      region: 'us-east-1',
      accessKeyId: creds?.AccessKeyId,
      secretAccessKey: creds?.SecretAccessKey,
      sessionToken: creds?.SessionToken
    });
    
    let resAuth = await cisp.adminInitiateAuth({
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
*/