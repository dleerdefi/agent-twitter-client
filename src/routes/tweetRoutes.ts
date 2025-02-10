// File: src/routes/tweetRoutes.ts
import { Router, Request, Response, RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';
import { accounts } from '../config/accountConfig';
import { Scraper } from 'agent-twitter-client';
import { Cookie } from 'tough-cookie';

export const tweetRouter = Router();

interface TweetRequestBody {
  accountId?: string;
  message?: string;
  mediaFilePaths?: string[];
  pollOptions?: string[];
  pollDurationMinutes?: number;
  tweetId?: string;
  username?: string;
}

interface MediaData {
  data: Buffer;
  mediaType: string;
}

interface TweetV2Options {
  poll?: {
    options: Array<{ label: string }>;
    duration_minutes: number;
  };
  mediaData?: MediaData[];
}

// Type guard for error
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Helper to initialize a valid Scraper session for any given accountId.
 * - Restores stored cookies if available
 * - Otherwise logs in and saves them
 */
async function getScraperForAccount(accountId: string): Promise<Scraper> {
  const accountConfig = accounts[accountId];
  if (!accountConfig) {
    throw new Error(`Account "${accountId}" not found in accountConfig.ts`);
  }

  const scraper = new Scraper();
  const cookiesFile = path.resolve(process.cwd(), `cookies-${accountId}.json`);

  // If cookies exist, attempt to restore them
  if (fs.existsSync(cookiesFile)) {
    try {
      const cookiesJson = fs.readFileSync(cookiesFile, 'utf-8');
      const cookies = JSON.parse(cookiesJson);
      
      // Convert to tough-cookie Cookie objects
      const cookieObjects = cookies.map((cookieData: any) => new Cookie({
        key: cookieData.key,
        value: cookieData.value,
        expires: cookieData.expires ? new Date(cookieData.expires) : undefined,
        domain: cookieData.domain,
        path: cookieData.path,
        secure: cookieData.secure,
        httpOnly: cookieData.httpOnly,
        sameSite: cookieData.sameSite,
        hostOnly: cookieData.hostOnly
      }));
      
      await scraper.setCookies(cookieObjects);
    } catch (error) {
      console.error('Error restoring cookies:', error);
      // If cookie restoration fails, proceed with fresh login
      await doLogin(scraper, accountConfig);
      const freshCookies = await scraper.getCookies();
      fs.writeFileSync(cookiesFile, JSON.stringify(freshCookies, null, 2), 'utf-8');
    }
  } else {
    // No cookies found → log in
    await doLogin(scraper, accountConfig);
    // Save cookies for future use
    const cookies = await scraper.getCookies();
    fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2), 'utf-8');
  }

  return scraper;
}

/**
 * Unified login approach that can handle either v1 or v2
 * based on whether API credentials are present in accountConfig.
 */
async function doLogin(scraper: Scraper, accountConfig: typeof accounts[keyof typeof accounts]): Promise<void> {
  const hasV2Creds =
    accountConfig.apiKey &&
    accountConfig.apiSecretKey &&
    accountConfig.accessToken &&
    accountConfig.accessTokenSecret;

  if (!accountConfig.username || !accountConfig.password) {
    throw new Error('Missing required credentials');
  }

  if (hasV2Creds && accountConfig.apiKey && accountConfig.apiSecretKey && 
      accountConfig.accessToken && accountConfig.accessTokenSecret) {
    await scraper.login(
      accountConfig.username,
      accountConfig.password,
      accountConfig.email,
      undefined,
      accountConfig.apiKey,
      accountConfig.apiSecretKey,
      accountConfig.accessToken,
      accountConfig.accessTokenSecret,
    );
  } else {
    await scraper.login(
      accountConfig.username,
      accountConfig.password,
      accountConfig.email,
    );
  }
}

// Actual Endpoints

/**
 * POST /tweets/send
 */
tweetRouter.post('/send', (async (req: Request<{}, any, TweetRequestBody>, res: Response) => {
  try {
    const {
      accountId = 'default',
      message,
      mediaFilePaths,
      pollOptions,
      pollDurationMinutes = 60,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'No tweet message provided.' });
    }

    const scraper = await getScraperForAccount(accountId);

    // Optionally read media files
    let mediaData: MediaData[] | undefined;
    if (Array.isArray(mediaFilePaths) && mediaFilePaths.length > 0) {
      mediaData = mediaFilePaths.map(filePath => ({
        data: fs.readFileSync(path.resolve(filePath)),
        mediaType: 'image/jpeg',
      }));
    }

    // If pollOptions exist, we can call sendTweetV2 with poll
    if (Array.isArray(pollOptions) && pollOptions.length > 0) {
      const options: TweetV2Options = {
        poll: {
          options: pollOptions.map((opt) => ({ label: opt })),
          duration_minutes: pollDurationMinutes,
        },
        mediaData,
      };
      const result = await scraper.sendTweetV2(message, undefined, options);
      return res.json({ success: true, result });
    } else {
      const result = await scraper.sendTweet(message, undefined, mediaData);
      return res.json({ success: true, result });
    }
  } catch (error) {
    console.error('/tweets/send error:', error);
    res.status(500).json({ error: isError(error) ? error.message : 'Unknown error' });
  }
}) as RequestHandler);

/**
 * POST /tweets/like
 */
tweetRouter.post('/like', (async (req: Request<{}, {}, TweetRequestBody>, res: Response) => {
  try {
    const { accountId = 'default', tweetId } = req.body;
    if (!tweetId) {
      res.status(400).json({ error: 'No tweetId provided.' });
      return;
    }
    const scraper = await getScraperForAccount(accountId);
    const result = await scraper.likeTweet(tweetId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('/tweets/like error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}) as RequestHandler);

/**
 * POST /tweets/retweet
 */
tweetRouter.post('/retweet', (async (req: Request<{}, {}, TweetRequestBody>, res: Response) => {
  try {
    const { accountId = 'default', tweetId } = req.body;
    if (!tweetId) {
      res.status(400).json({ error: 'No tweetId provided.' });
      return;
    }
    const scraper = await getScraperForAccount(accountId);
    const result = await scraper.retweet(tweetId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('/tweets/retweet error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}) as RequestHandler);

/**
 * POST /tweets/follow
 */
tweetRouter.post('/follow', (async (req: Request<{}, {}, TweetRequestBody>, res: Response) => {
  try {
    const { accountId = 'default', username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'No username provided.' });
    }
    const scraper = await getScraperForAccount(accountId);
    const result = await scraper.followUser(username);
    res.json({ success: true, result });
  } catch (error) {
    console.error('/tweets/follow error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}) as RequestHandler);