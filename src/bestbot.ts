import lemmybot from 'lemmy-bot';
import {Youtube} from './youtube.js';
import {config} from 'dotenv';

config();
const {LEMMY_INSTANCE, LEMMY_USERNAME_OR_EMAIL, LEMMY_PASSWORD} =
  process.env as Record<string, string>;

const CommunityToPlaylistId: Map<string, string> = new Map(Object.entries({
  "importantvideos": "PLHwBlZp_DJfmuZceDJJsIVbal9JO_hteM",
  "bideos": "PLHwBlZp_DJfl2vj6hjEmbmT7LVk9YD0bX",
  "sketchy": "PLHwBlZp_DJfkHuKW-XFJT4XEafTIRnRVQ",
  "worksofart": "PLHwBlZp_DJfkC1gPkrRPtxGxeeYJAOCwh",
  "aminals": "PLHwBlZp_DJfnndZCZdfyAwA9lNpxGO4v0",
  "musicbideos": "PLHwBlZp_DJfnfMU7n5IT-8CfPRbJAyb-L",
  "norm": "PLHwBlZp_DJfkB6Tm-CKNe_IplzaMIXtYE",
  "standup": "PLHwBlZp_DJflhO0ifYF1mXEAAal58-E0o",
  "mealtimevideos": "PLHwBlZp_DJfn_dCiWOFHIVY5SHf3iBF_D",
  "memestalgia": "PLHwBlZp_DJfldRJ0DvLyeYzZVAUqT0ATF",
  "panelshow": "PLHwBlZp_DJflkEDf33bF7g_pxZD2JWEOF",
}));

const CommunityToMinVotes: Map<string, number> = new Map(Object.entries({
  "importantvideos": 6,
  "importantimages": 25,
  "sketchy": 5,
  "worksofart": 5,
  "bideos": 4,
  "aminals": 4,
  "musicbideos": 4,
  "norm": 4,
  "standup": 4,
  "mealtimevideos": 4,
  "memestalgia": 4,
  "panelshow": 3,
}));

const ImportantCommunities: Set<string> = new Set(["importantvideos", "importantimages", "sketchy", "worksofart", "memestalgia"]);

export class BestBot extends lemmybot.LemmyBot {
  public static youtube: Youtube = new Youtube();
  public static errorReprocessMinutes: number = 1;
  public static lowScoreReprocessMinutes: number = 20;
  constructor(botOptions: lemmybot.BotOptions) {
    super(botOptions);
  }

  start() {
    BestBot.youtube.authorize(() => super.start());
  }

  public static videoPostHandler(postView: lemmybot.PostView, callback) {
    if (!this.youtube.youtubeRegex.test(postView.post.url)) {
      console.warn("Skipping post that doesn't contain youtube link:", postView.community.name, postView.post.name);
      callback(null, null);
      return;
    }
    if (!CommunityToPlaylistId.has(postView.community.name)) {
      console.warn("Not adding post from unsupported community:", postView.community.name, postView.post.name);
      callback(null, null);
      return;
    }
    let playlistId = CommunityToPlaylistId.get(postView.community.name)
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
  dbFile: 'best_db.sqlite3',
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
    secondsBetweenPolls: 1200
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
        botActions,
        reprocess
      }) => {
        if (postView.post.deleted || postView.post.removed) {
          console.info("not processing deleted post:", postView.community.name, postView.post.name);
          return;
        }
        const minVotes = CommunityToMinVotes.has(postView.community.name) ? CommunityToMinVotes.get(postView.community.name) : 0;
        if (postView.counts.upvotes < minVotes && !postView.creator_is_admin) {
          console.info("score too low:", postView.post.name, "; score:", postView.counts.score, "; upvotes:", postView.counts.upvotes);
          const now = Date.now();
          const published = Date.parse(postView.post.published);
          const diffHours = (now - published) / 3600000;
          console.info("been reprocessing for ", diffHours, "hours", postView.community.name, postView.post.name, postView.counts.upvotes);
          if (diffHours > 20) {
            if (ImportantCommunities.has(postView.community.name)) {
              console.info("removing post:", postView.community.name, postView.post.name, postView.counts.upvotes);
              const created = botActions.createComment({post_id: postView.post.id, content: "The people have voted, and regretfully this post has been deemed `not important`. Better luck next time."})
              created.then(() =>
                botActions.removePost({post_id: postView.post.id, removed: true, reason: "not important enough"})
              );
            }
            console.info("no longer attempting to reprocess:", postView.community.name, postView.post.name);
            return;
          }
          console.info("reprocessing:", postView.post.name, "in", BestBot.lowScoreReprocessMinutes, "minutes");
          reprocess(BestBot.lowScoreReprocessMinutes);
          return;
        }
        const publishedTimestamp = new Date(postView.post.published);
        const now = new Date();
        const anchor = 1680000000000
        const scheduleMillis = Math.pow(((publishedTimestamp.getTime() - anchor) / (now.getTime() - anchor)), 64) * 10000;
        console.info("scheduling handler for:", postView.community.name, postView.post.name, "in", scheduleMillis / 1000, "seconds");

        const videoPostCallback = (err, resp) => {
          if (err) {
            console.warn("errored! ", err);
            console.info("reprocessing:", postView.post.name, "in", BestBot.errorReprocessMinutes, "minutes");
            reprocess(BestBot.errorReprocessMinutes);
          } else if (resp) {
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
