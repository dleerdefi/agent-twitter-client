// File: src/config/accountConfig.ts
import dotenv from 'dotenv';

dotenv.config();

export interface TwitterAccount {
  username: string | undefined;
  password: string | undefined;
  email: string | undefined;
  apiKey?: string | undefined;
  apiSecretKey?: string | undefined;
  accessToken?: string | undefined;
  accessTokenSecret?: string | undefined;
}

export const accounts: Record<string, TwitterAccount> = {
  default: {
    username: process.env.TWITTER_USERNAME,
    password: process.env.TWITTER_PASSWORD,
    email: process.env.TWITTER_EMAIL,
    apiKey: process.env.TWITTER_API_KEY,
    apiSecretKey: process.env.TWITTER_API_SECRET_KEY,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  },
  // Additional accounts ...
  // account2: {
  //   username: 'account2_user',
  //   password: 'account2_pass',
  //   email: 'account2_email@example.com',
  //   ...
  // },
};