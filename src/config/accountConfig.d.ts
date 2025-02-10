export interface AccountConfig {
  username: string;
  password: string;
  email?: string;
  apiKey?: string;
  apiSecretKey?: string;
  accessToken?: string;
  accessTokenSecret?: string;
}

export const accounts: Record<string, AccountConfig>; 