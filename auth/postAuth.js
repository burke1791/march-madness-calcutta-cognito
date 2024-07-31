import pg from 'pg';
import { callbackWaitsForEmptyEventLoopFalse } from '../utilities/common';

const { Client } = pg;

const client = new Client();

export async function syncUserInDatabase(event, context, callback) {
  callbackWaitsForEmptyEventLoopFalse(context);

  const email = event.request.userAttributes.email;
  const alias = event.request.userAttributes.preferred_username;
  const cognitoSub = event.request.userAttributes.sub;

  try {
    await client.connect();

    const res = await client.query('Call public.up_sync_user_with_cognito($1, $2, $3)', [email, alias, cognitoSub]);
    console.log(res);
  } catch (error) {
    console.log(error);
  }

  callback(null, event);
}