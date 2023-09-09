import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from 'dotenv';
import Lien from "lien";
import * as fs from 'fs';
import * as readline from 'readline';
import {GaxiosResponse} from 'gaxios';

const OAuth2 = google.auth.OAuth2;

const server = new Lien({
  host: "localhost",
  port: 5000
});

config();
const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET } = process.env as Record<string, string>;
const REDIRECT_URI = 'http://localhost:5000/oauthcallback'
const CREDENTIALS = {client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, redirect_uris: [REDIRECT_URI]};
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
];

server.addPage("/oauthcallback", lien => {
    console.log("Code obtained:", lien.query.code);
});

export type PlaylistItemsResponse = GaxiosResponse<youtube_v3.Schema$PlaylistItemListResponse>;
export type SearchListResponse = GaxiosResponse<youtube_v3.Schema$SearchListResponse>;
export type SearchResult = youtube_v3.Schema$SearchResult;

export class Youtube {
  readonly playlistTitle: string;
  readonly tokenDir: string;
  readonly tokenPath: string;
  readonly credentials: {client_id: string; client_secret: string; redirect_uris: string[];};
  readonly youtubeRegex = new RegExp(
    '(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?\\/ ]{11})'
  );
  youtube: youtube_v3.Youtube;
  auth: OAuth2Client;
  constructor() {
    this.playlistTitle = `Cool Beans`;
    this.tokenDir = '.credentials/';
    this.tokenPath = this.tokenDir + 'best-bot.json';
    this.credentials = CREDENTIALS;
    this.authorize(() => console.log("authed"));
    return this;
  }

  withAuth(oauth2Client: OAuth2Client): this {
    this.auth = oauth2Client;
    this.youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });
    console.log("Authorized!");
    return this;
  }

  /** check if the url is a youtube video **/
  isYoutubeUrl(url: string): boolean {
    return this.youtubeRegex.test(url);
  }

  /** extract videoId from youtube url **/
  extractVideoId(youtubeUrl: string): string {
    const urlParts: RegExpExecArray = this.youtubeRegex.exec(youtubeUrl);
    // console.info("urlParts:", urlParts);
    return urlParts[1];
  }

  /** Build a youtube url from a videoId */
  buildVideoUrl(videoId: string, shortForm: boolean = true): string {
    if (shortForm) {
      return `https://youtu.be/${videoId}`;
    }
    return `https://youtube.com/watch?v=${videoId}`;
  }

  // TODO: create a more robust version of this method
  // /** check if the url is a youtube video **/
  // isYoutubeUrl(url: string): boolean {
  //   const urlObj = new URL(url);
  //   if (
  //       urlObj.hostname.endsWith(".youtube.com") ||
  //       urlObj.hostname === "youtube.com" ||
  //       urlObj.hostname === "youtube-nocookie.com" ||
  //       urlObj.hostname === "youtu.be"
  //   ) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  addVideoToPlaylistNoDupes(playlistId: string, videoUrl: string, callback): void {
    if(!this.isYoutubeUrl(videoUrl)) {
      console.warn("Can't add invalid youtube video url:", videoUrl);
      callback(null, null);
      return;
    }
    let videoId = this.extractVideoId(videoUrl);

    return this.getPlaylistContents(playlistId, (itemsError, itemsResponse) => {
      if(itemsError) {
        callback(itemsError, itemsResponse);
        return itemsResponse;
      }
      const items = new Set(itemsResponse.data.items.map(item => item.contentDetails.videoId));
      if(items.has(videoId)) {
        console.info("already in playlist:", videoUrl);
        callback(null, null);
        return itemsResponse;
      }
      this.addVideoToPlaylist(playlistId, videoUrl, (err, response) => {
        callback(err, response);
      });
      return itemsResponse;
    });
  }

  addVideoToPlaylist(playlistId: string, videoUrl: string, callback): void {
    if(!this.youtubeRegex.test(videoUrl)) {
      console.warn("Can't add invalid youtube video url:", videoUrl);
      callback(null, null);
      return;
    }
    let videoId = this.youtubeRegex.exec(videoUrl)[1];

    this.youtube.playlistItems.insert(
    { auth: this.auth, part: ['snippet'], requestBody: 
    {
      snippet: {
        playlistId: playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: videoId,
        },
      },
    }}, callback);
  }

  getPlaylistContents(playlistId: string, callback: {(err?: Error, response?: PlaylistItemsResponse): void}): void {
    this.youtube.playlistItems.list({playlistId: playlistId, part: ['contentDetails'], maxResults: 5000}, (err?: Error, response?: PlaylistItemsResponse) => {
      // console.warn("err:", err);
      // console.info("items:", response.items);
      callback(err, response);
    });
  }

  getChannelVideos(channelId: string, lookback: number, callback: {(err?: Error, items?: SearchResult[]): void}): void {
    this.youtube.search.list({channelId: channelId, part: ['snippet'], order: "date", maxResults: lookback}, (err?: Error, response?: SearchListResponse) => {
      if (err) {
        console.info("error fetching channel videos", err);
        callback(err, []);
        return;
      }
      const videos = response.data.items.filter(item => item.id.kind == 'youtube#video')
      callback(err, videos);
    });
  }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   *
   * @param {function} callback The callback to call with the authorized client.
   */
  authorize(callback: Function) {
    var clientSecret = this.credentials.client_secret;
    var clientId = this.credentials.client_id;
    var redirectUrl = this.credentials.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(this.tokenPath, (err, token) => {
      if (err) {
        this.getNewToken(oauth2Client, (auth: OAuth2Client) => {
          this.withAuth(auth);
          callback();
        });
      } else {
        oauth2Client.credentials = JSON.parse(token.toString());
        console.log("Read credentials from:", this.tokenPath);
        this.withAuth(oauth2Client);
        callback();
      }
    });
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   *
   * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback to call with the authorized
   *     client.
   */
  getNewToken(oauth2Client: OAuth2Client, callback: (oauth2Client: OAuth2Client) => any) {
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oauth2Client.getToken(code, (err, token) => {
        if (err) {
          console.warn('Error while trying to retrieve access token', err);
          return;
        }
        console.log('token: ', token);
        oauth2Client.credentials = token;
        this.storeToken(token);
        return callback(oauth2Client);
      });
    });
  }

  /**
   * Store token to disk be used in later program executions.
   *
   * @param {Object} token The token to store to disk.
   */
  storeToken(token: object) {
    try {
      fs.mkdirSync(this.tokenDir);
    } catch (err) {
      if (err.code != 'EEXIST') {
        throw err;
      }
    }
    fs.writeFile(this.tokenPath, JSON.stringify(token), (err) => {
      if (err) throw err;
      console.log('Token stored to: ', this.tokenPath);
    });
  }
}
