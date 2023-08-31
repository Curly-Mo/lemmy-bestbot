import lemmybot from 'lemmy-bot';
import { Youtube } from './youtube.js';
import { config } from 'dotenv';

config();
const { LEMMY_INSTANCE, LEMMY_USERNAME_OR_EMAIL, LEMMY_PASSWORD } =
  process.env as Record<string, string>;

export const youtube = new Youtube();

const communityToPlaylistId: Map<string, string> = new Map(Object.entries({
  "importantvideos": "PLHwBlZp_DJfmuZceDJJsIVbal9JO_hteM",
  "bideos": "PLHwBlZp_DJfl2vj6hjEmbmT7LVk9YD0bX",
  "sketchy": "PLHwBlZp_DJfkHuKW-XFJT4XEafTIRnRVQ",
  "worksofart": "PLHwBlZp_DJfkC1gPkrRPtxGxeeYJAOCwh",
  "aminals": "PLHwBlZp_DJfnndZCZdfyAwA9lNpxGO4v0"
}));

export class BestBot extends lemmybot.LemmyBot {
  public static youtube: Youtube = new Youtube();
  public static errorReprocessMinutes: number = 1;
  public static lowScoreReprocessMinutes: number = 10;
  constructor(botOptions: lemmybot.BotOptions) {
    super(botOptions);
  }

  start() {
    BestBot.youtube.authorize(() => super.start());
  }

  public static videoPostHandler(postView: lemmybot.PostView, callback) {
    if (!communityToPlaylistId.has(postView.community.name)) {
      console.warn("Not adding post from unsupported community:", postView.community.name, postView.post.name);
      callback(null, null);
      return;
    }
    let playlistId = communityToPlaylistId.get(postView.community.name)
    console.log("adding:", postView.post.url, "to", playlistId);
    this.youtube.addVideoToPlaylistNoDupes(playlistId, postView.post.url, callback);
  }

}

export const bestbot: BestBot = new BestBot({
  // Pass configuration options here
  instance: LEMMY_INSTANCE,
  credentials: {
    username: LEMMY_USERNAME_OR_EMAIL,
    password: LEMMY_PASSWORD,
  },
  dbFile: 'db.sqlite3',
  federation: 'local',
  // federation: {
  //   allowList: [
  //     {
  //       instance: LEMMY_INSTANCE,
  //       communities: [COMMUNITY],
  //     },
  //   ],
  // },
  connection: {
    // minutesUntilReprocess: 1,
    secondsBetweenPolls: 60
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
        if (!BestBot.youtube.youtubeRegex.test(postView.post.url)) {
          console.warn("Skipping post that doesn't contain youtube link:", postView.community.name, postView.post.name);
          return;
        }
        if (postView.counts.score < 25 && !postView.creator.admin) {
          console.info("score too low:", postView.post.name, "; upvotes:", postView.counts.upvotes);
          console.info("reprocessing:", postView.post.name, "in", BestBot.lowScoreReprocessMinutes, "minutes");
          reprocess(BestBot.lowScoreReprocessMinutes);
          return;
        }
        const publishedTimestamp = new Date(postView.post.published);
        const now = new Date();
        const anchor = 1680000000000
        const scheduleMillis = Math.pow(((publishedTimestamp.getTime() - anchor) / (now.getTime() - anchor)), 64)*10000;
        console.info("scheduling handler for:", postView.community.name, postView.post.name, "in", scheduleMillis / 1000, "seconds");

        const videoPostCallback = (err, resp) => {
          if(err) {
            console.warn("errored! ", err);
            console.info("reprocessing:", postView.post.name, "in", BestBot.errorReprocessMinutes, "minutes");
            reprocess(BestBot.errorReprocessMinutes);
          } else if(resp) {
            console.info("Successfully added:", postView.post.name);
            // console.info("preventing reprocess:", postView.post.name);
            // preventReprocess();
          } else {
            console.info("nothing done for:", postView.post.name);
          }
        }

        setTimeout(() => BestBot.videoPostHandler(postView, videoPostCallback), scheduleMillis);
      }
    }
  },
  markAsBot: false,
});
