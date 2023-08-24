import lemmybot from 'lemmy-bot';
import { Youtube } from './youtube.js';
import { config } from 'dotenv';

config();
// const { LEMMY_INSTANCE, LEMMY_USERNAME_OR_EMAIL, LEMMY_PASSWORD, COMMUNITY, API_KEY } =
const { LEMMY_INSTANCE, LEMMY_USERNAME_OR_EMAIL, LEMMY_PASSWORD, COMMUNITY } =
  process.env as Record<string, string>;

export const youtube = new Youtube();
// const youtube = Youtube.create();

// type SupportedVideoCommunity = 'importantvideos' | 'bideos' | 'sketchy'

// const communityToPlaylistId: { [communityName: string]: string } = {
//     "importantvideos": "PLHwBlZp_DJfnU1KAem7IYHDNXjVmIxAlv",
//     "bideos": "test",
//     "sketchy": "test",
// };

const communityToPlaylistId: Map<string, string> = new Map(Object.entries({
  "importantvideos": "PLHwBlZp_DJfmuZceDJJsIVbal9JO_hteM",
  "bideos": "PLHwBlZp_DJfl2vj6hjEmbmT7LVk9YD0bX",
  "sketchy": "PLHwBlZp_DJfkHuKW-XFJT4XEafTIRnRVQ",
}));

export class BestBot extends lemmybot.LemmyBot {
  public static youtube: Youtube = new Youtube();
  public static errorReprocessMinutes: number = 1;
  public static lowScoreReprocessMinutes: number = 10;
  // public static postSemaphore: number = 0;
  // readonly youtube: Youtube;
  constructor(botOptions: lemmybot.BotOptions) {
    super(botOptions);
    // this.youtube = youtube;
  }

  start() {
    BestBot.youtube.authorize(() => super.start());
  }

  public static videoPostHandler(postView: lemmybot.PostView, callback) {
    // console.log("postView: ", postView);
    // console.log("community: ", postView.community);
    // let playlistId = communityToPlaylistId.get(postView.community.name)
    // console.log("playlistId: ", playlistId);
    if (communityToPlaylistId.has(postView.community.name)) {
      let playlistId = communityToPlaylistId.get(postView.community.name)
      console.log("adding: ", postView.post.url);
      console.log("adding to: ", playlistId);
      this.youtube.addVideoToPlaylistNoDupes(playlistId, postView.post.url, callback);
    } else {
      console.warn("Not adding post with invalid youtube url: ", postView.post.name);
      callback(null, null);
    }
  }

}

export const bestbot: BestBot = new BestBot({
  // Pass configuration options here
  instance: LEMMY_INSTANCE,
  credentials: {
    username: LEMMY_USERNAME_OR_EMAIL,
    password: LEMMY_PASSWORD,
  },
  // dbFile: 'db.sqlite3',
  // federation: 'local',
  // federation: {
  //   allowList: [
  //     {
  //       instance: LEMMY_INSTANCE,
  //       communities: [COMMUNITY],
  //     },
  //   ],
  // },
  federation: {
    allowList: [
      {
        instance: LEMMY_INSTANCE,
        communities: ["bideos"],
      },
    ],
  },
  connection: {
    // minutesUntilReprocess: 1,
    secondsBetweenPolls: 30
  },
  handlers: {
    post: {
      sort: 'New',
      handle: ({
        postView,
        // postView: {
        //   post: { id, url },
        //   community: { name },
        //   counts: { score }
        // },
        // botActions: { }
        reprocess
      }) => {
        // console.info("semaphore1: ", BestBot.postSemaphore);
        if (postView.counts.score > 20) {
          const publishedTimestamp = new Date(postView.post.published);
          const now = new Date();
          const anchor = 1680000000000
          const scheduleMillis = Math.pow(((publishedTimestamp.getTime() - anchor) / (now.getTime() - anchor)), 64)*10000;
          console.info("now: ", now);
          console.info("published: ", publishedTimestamp);
          console.info("scheduleMillis: ", scheduleMillis);
          console.info("scheduling handler for: ", postView.post.name, " in ", scheduleMillis / 1000, " seconds");
          setTimeout(() => BestBot.videoPostHandler(postView, (err, resp) => {
            // BestBot.postSemaphore--;
            // console.info("semaphore2: ", BestBot.postSemaphore);
            if(err) {
              console.warn("errored! ", err);
              console.info("reprocessing: ", postView.post.name, " in ", BestBot.errorReprocessMinutes, " minutes");
              reprocess(BestBot.errorReprocessMinutes);
            } else {
              // console.info("preventing reprocess: ", postView.post.name);
              // preventReprocess();
            }
          }), scheduleMillis);
          // }), 5000 * BestBot.postSemaphore);
          // BestBot.postSemaphore++;
        } else {
          console.info("score too low: ", postView.post.name, "; upvotes: ", postView.counts.upvotes);
          console.info("reprocessing: ", postView.post.name, " in ", BestBot.lowScoreReprocessMinutes, " minutes");
          reprocess(BestBot.lowScoreReprocessMinutes);
        }
      }
    }
    // post: (res) => {
    //   // console.log(res.postView.community);
    //   // console.log(res.postView.post.name);
    //   // console.log(res.postView.post.url);
    //   // console.log(res.postView.post.id);
    //   // youtube.updatePlaylist([res.postView.post.url])
    //   // if(youtube.auth !== undefined) {
    //   //   youtube.test([res.postView.post.url])
    //   // }
    //   // youtube.test([res.postView.post.url])
    //   let result = BestBot.videoPostHandler(res.postView);
    //   console.log("result: ", result);
    // }
  },
  markAsBot: false,
});
