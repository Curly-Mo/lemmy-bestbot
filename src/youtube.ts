import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from 'dotenv';
import Lien from "lien";
import * as fs from 'fs';
import * as readline from 'readline';
// import interact from 'cli-interact';

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

// const oauth2Client = new OAuth2(
//   YOUTUBE_CLIENT_ID,
//   YOUTUBE_CLIENT_SECRET,
//   REDIRECT_URI
// );

// const youtube = google.youtube({
//   version: 'v3',
//   auth: oauth2Client
// });

// server.addPage("/", lien => {
//     var url = oauth2Client.generateAuthUrl({
//         access_type: "offline",
//         scope: SCOPES
//     });
//     lien.end("<a href='"+url+"'>Authenticate yourself</a>");
// })

server.addPage("/oauthcallback", lien => {
    console.log("Code obtained: ", lien.query.code);
    // oauth2Client.getToken(lien.query.code, (err, tokens) => {
    //     if(err){
    //         return console.log(err);
    //     }

    //     oauth2Client.setCredentials(tokens);
    //     youtube.playlists.list(
    //       {
    //         mine: true,
    //         part: ['id', 'snippet'],
    //         // resource: {
    //         //     snippet: {
    //         //         title:"Test",
    //         //         description:"Description",
    //         //     }
    //         // }
    //     },
    //     (err, response) => {
    //         if (err) {
    //             lien.end('Error: ' + err);
    //         }
    //         // else if (data) {
    //         //     lien.end(data);
    //         // }
    //         if (response) {
    //             console.log('Status code: ' + response.status);
    //         }
    //     });
    // });
});

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
  constructor() { // interval: Interval) {
    // this.playlistTitle = `Top of ${interval}`;
    this.playlistTitle = `Cool Beans`;
    this.tokenDir = '.credentials/';
    this.tokenPath = this.tokenDir + 'best-bot.json';
    this.credentials = CREDENTIALS;
    this.authorize(() => console.log("authed"));
    return this;
    // this.auth = oauth2Client;
    // this.youtube = google.youtube({
    //   version: 'v3',
    //   auth: oauth2Client
    // });

    // this.credentials = {client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET, redirect_uris: [REDIRECT_URI]};
    // this.authorize(credentials, (oauth2Client: OAuth2Client) => {
    //   console.log("oauth: ", oauth2Client);
    //   console.log("oauth credentials: ", oauth2Client.credentials);
    //   console.log("oauth access_token: ", oauth2Client.credentials.access_token);
    //   console.log("oauth refresh_token: ", oauth2Client.credentials.refresh_token);
    //   this.youtube = google.youtube({
    //     version: 'v3',
    //     auth: oauth2Client
    //   });
    //   this.auth = oauth2Client;
    // });
  }

  // public static create() {
  //   let instance = new Youtube();
  //   instance.authorize()
  //   return instance;
  // }

  // // public static create = async () => {
  // public static create() {
  //   // let tokenDir = '.credentials/';
  //   // let tokenPath = tokenDir + 'best-bot.json';

  //   let instance = new Youtube();
  //   // return await instance.authorize(instance.withAuth)

  //   instance.authorize()
  //   return instance;
  //   // return await instance.authorize((oauth2Client: OAuth2Client) => {
  //   //   // console.log("oauth: ", oauth2Client);
  //   //   // console.log("oauth credentials: ", oauth2Client.credentials);
  //   //   // console.log("oauth access_token: ", oauth2Client.credentials.access_token);
  //   //   // console.log("oauth refresh_token: ", oauth2Client.credentials.refresh_token);
  //   //   // // this.youtube = google.youtube({
  //   //   // //   version: 'v3',
  //   //   // //   auth: oauth2Client
  //   //   // // });
  //   //   return instance.withAuth(oauth2Client)
  //   // });
  // }

  withAuth(oauth2Client: OAuth2Client) {
    // console.log("oauth: ", oauth2Client);
    // console.log("oauth credentials: ", oauth2Client.credentials);
    // console.log("oauth access_token: ", oauth2Client.credentials.access_token);
    // console.log("oauth refresh_token: ", oauth2Client.credentials.refresh_token);
    this.auth = oauth2Client;
    this.youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });
    console.log("Authorized!");
    return this;
  }

  // public static create() {
  //   return (async () => {
  //     const instance = new Youtube();
  //     await instance.authorize(this.credentials, (oauth2Client: OAuth2Client) => {
  //       console.log("oauth: ", oauth2Client);
  //       console.log("oauth credentials: ", oauth2Client.credentials);
  //       console.log("oauth access_token: ", oauth2Client.credentials.access_token);
  //       console.log("oauth refresh_token: ", oauth2Client.credentials.refresh_token);
  //       this.youtube = google.youtube({
  //         version: 'v3',
  //         auth: oauth2Client
  //       });
  //       this.auth = oauth2Client;
  //     });
  //     return instance;
  //   })();
  // }

  // test(videos: string[]): void {
  //   // this.youtube.playlists.list({id: ['PLHwBlZp_DJfmuZceDJJsIVbal9JO_hteM'], part: ['snippet']}, (err, response) => {
  //   //   console.log("err: ", err);
  //   //   console.log("response: ", response);
  //   //   console.log("items: ", response.data.items);
  //   //   console.log("item_id: ", response.data.items.at(0).id);
  //   //   console.log("item_detail: ", response.data.items.at(0).contentDetails);
  //   //   console.log("items_kind: ", response.data.items.at(0).kind);
  //   //   console.log("items_snippet: ", response.data.items.at(0).snippet);
  //   //   console.log("items_status: ", response.data.items.at(0).status);
  //   // });

  //   // this.youtube.playlists.insert({auth: this.auth, part: ['snippet'], requestBody: {snippet: {title: "coolcoolcool", description: "rad"}}}, (err, response) => {
  //   //   console.log("err: ", err);
  //   //   console.log("response: ", response);
  //   // });


  //   // this.youtube.playlists.insert(
  //   // { auth: this.auth, access_token: this.auth.credentials.access_token,
  //   //   part: ['snippet', 'status'],
  //   //   requestBody: {
  //   //     snippet: {
  //   //       title: "hello",
  //   //       description: "description"
  //   //     },
  //   //     status: {
  //   //       privacyStatus: "private"
  //   //     }
  //   //   }
  //   // }, (err, response) => {
  //   //   console.log("err: ", err);
  //   //   console.log("response: ", response);
  //   // });


  //   console.info("videos: ", videos);
  //   videos.forEach((video) => {
  //     console.info("video: ", video);
  //     try {
  //       this.addVideoToPlaylist("PLHwBlZp_DJfnU1KAem7IYHDNXjVmIxAlv", video);
  //     } catch (e) {
  //       console.log(e);
  //     }
  //   });

  //   // const playlists = YouTube.Playlists.list('id,snippet', {
  //   //   mine: true,
  //   // });
  //   // let playlist = playlists.items.find(
  //   //   (p) => p.snippet.title === this.playlistTitle
  //   // );

  //   // if (playlist === undefined) {
  //   //   playlist = this.createPlaylist();
  //   // }
  //   // // } else {
  //   // //   playlist = this.recreatePlaylist(playlist.id);
  //   // // }

  //   // videos.forEach((video) => {
  //   //   try {
  //   //     this.addVideoToPlaylist(playlist.id, video);
  //   //   } catch (e) {
  //   //     Logger.log(e);
  //   //   }
  //   // });
  // }

  // updatePlaylist(videos: string[]): void {
  //   const playlists = YouTube.Playlists.list('id,snippet', {
  //     mine: true,
  //   });
  //   let playlist = playlists.items.find(
  //     (p) => p.snippet.title === this.playlistTitle
  //   );

  //   if (playlist === undefined) {
  //     playlist = this.createPlaylist();
  //   }
  //   // } else {
  //   //   playlist = this.recreatePlaylist(playlist.id);
  //   // }

  //   videos.forEach((video) => {
  //     try {
  //       this.addVideoToPlaylist(playlist.id, video);
  //     } catch (e) {
  //       Logger.log(e);
  //     }
  //   });
  // }

  // private createPlaylist(): GoogleAppsScript.YouTube.Schema.Playlist {
  //   return YouTube.Playlists.insert(
  //     {
  //       snippet: {
  //         title: this.playlistTitle,
  //       },
  //       status: {
  //         privacyStatus: 'private',
  //       },
  //     },
  //     'snippet,status'
  //   );
  // }

  // private recreatePlaylist(
  //   playlistId: string
  // ): GoogleAppsScript.YouTube.Schema.Playlist {
  //   YouTube.Playlists.remove(playlistId);
  //   return this.createPlaylist();
  // }

  // private addVideoToPlaylist(playlistId: string, video: string): void {
  //   YouTube.PlaylistItems.insert(
  //     {
  //       snippet: {
  //         playlistId: playlistId,
  //         resourceId: {
  //           kind: 'youtube#video',
  //           videoId: video,
  //         },
  //       },
  //     },
  //     'snippet'
  //   );
  // }

  addVideoToPlaylistNoDupes(playlistId: string, videoUrl: string, callback): void {
    if(!this.youtubeRegex.test(videoUrl)) {
      console.warn("Can't add invalid youtube video url: ", videoUrl);
    }
    let videoId = this.youtubeRegex.exec(videoUrl)[1];

    this.getPlaylistContents(playlistId, (itemsError, itemsResponse) => {
      if(itemsError) {
        callback(itemsError, itemsResponse);
      } else {
        // const itemsList = itemsResponse.data.items.map(item => item.contentDetails.videoId);
        const items = new Set(itemsResponse.data.items.map(item => item.contentDetails.videoId));
        // console.info("itemList: ", itemsList);
        // console.info("items: ", items);
        // console.info("videoUrl: ", videoUrl);
        // console.info("videoId: ", videoId);
        if(!items.has(videoId)) {
          this.addVideoToPlaylist(playlistId, videoUrl, (err, response) => {
            callback(err, response);
            // console.log("contents: ", response.data.items);
          });
        } else {
          console.info("already in playlist: ", videoUrl);
          callback(null, null);
        }
      }
    });
  }

  addVideoToPlaylist(playlistId: string, videoUrl: string, callback): void {
    if(!this.youtubeRegex.test(videoUrl)) {
      console.warn("Can't add invalid youtube video url: ", videoUrl);
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
    // (err, response) => {
    //   // console.warn("err: ", err);
    //   // console.log("response: ", response);
    //   callback(err, response);
    // });
  }

  getPlaylistContents(playlistId: string, callback): void {
    this.youtube.playlistItems.list({playlistId: playlistId, part: ['contentDetails'], maxResults: 5000}, (err, response) => {
      // console.warn("err: ", err);
      // console.info("items: ", response.items);
      callback(err, response);
    });

  }

  /** check if the url is a youtube video **/
  isYoutubeUrl(url: string): boolean {
    const urlObj = new URL(url);
    if (
        urlObj.hostname.endsWith(".youtube.com") ||
        urlObj.hostname === "youtube.com" ||
        urlObj.hostname === "youtube-nocookie.com" ||
        urlObj.hostname === "youtu.be"
    ) {
      return true;
    } else {
      return false;
    }
  }


  // /**
  //  * Create an OAuth2 client with the given credentials, and then execute the
  //  * given callback function.
  //  *
  //  * @param {Object} credentials The authorization client credentials.
  //  * @param {function} callback The callback to call with the authorized client.
  //  */
  // async authorize(callback) {
  //   var clientSecret = this.credentials.client_secret;
  //   var clientId = this.credentials.client_id;
  //   var redirectUrl = this.credentials.redirect_uris[0];
  //   var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  //   // Check if we have previously stored a token.
  //   fs.readFile(this.tokenPath, (err, token) => {
  //     if (err) {
  //       return this.getNewToken(oauth2Client, callback);
  //     } else {
  //       oauth2Client.credentials = JSON.parse(token.toString());
  //       console.log("Read credentials from: ", this.tokenPath);
  //       return callback(oauth2Client);
  //     }
  //   });
  // }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   *
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  authorize(callback) {
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
        console.log("Read credentials from: ", this.tokenPath);
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
  getNewToken(oauth2Client: OAuth2Client, callback) {
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

  // /**
  //  * Get and store new token after prompting for user authorization, and then
  //  * execute the given callback with the authorized OAuth2 client.
  //  *
  //  * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
  //  * @param {getEventsCallback} callback The callback to call with the authorized
  //  *     client.
  //  */
  // getNewToken(oauth2Client: OAuth2Client) {
  //   var authUrl = oauth2Client.generateAuthUrl({
  //     access_type: 'offline',
  //     scope: SCOPES
  //   });
  //   console.log('Authorize this app by visiting this url: ', authUrl);
  //   let code = interact.question('Enter the code from that page here: ');
  //   console.log('you answered:', code);
  //   oauth2Client.getToken(code, (err, token) => {
  //     if (err) {
  //       console.log('Error while trying to retrieve access token', err);
  //       return;
  //     }
  //     console.log('token: ', token);
  //     oauth2Client.credentials = token;
  //     this.storeToken(token);
  //     this.withAuth(oauth2Client);
  //   });

  //   // var rl = readline.createInterface({
  //   //   input: process.stdin,
  //   //   output: process.stdout
  //   // });
  //   // rl.question('Enter the code from that page here: ', (code) => {
  //   //   rl.close();
  //   //   // oauth2Client.getToken(code,
  //   //   // , (err, token) => {
  //   //   //   if (err) {
  //   //   //     console.log('Error while trying to retrieve access token', err);
  //   //   //     return;
  //   //   //   }
  //   //   //   console.log('token: ', token);
  //   //   //   oauth2Client.credentials = token;
  //   //   //   this.storeToken(token);
  //   //   //   return oauth2Client;
  //   //   // });
  //   // });
  // }

  /**
   * Store token to disk be used in later program executions.
   *
   * @param {Object} token The token to store to disk.
   */
  storeToken(token) {
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
