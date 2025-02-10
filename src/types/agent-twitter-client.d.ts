declare module 'agent-twitter-client' {
  export class Scraper {
    login(username: string, password: string, email?: string, ...args: any[]): Promise<void>;
    isLoggedIn(): Promise<boolean>;
    setCookies(cookies: any): Promise<void>;
    getCookies(): Promise<any>;
    sendTweet(message: string, ...args: any[]): Promise<any>;
    sendTweetV2(message: string, ...args: any[]): Promise<any>;
    likeTweet(tweetId: string): Promise<any>;
    retweet(tweetId: string): Promise<any>;
    followUser(username: string): Promise<any>;
  }
} 