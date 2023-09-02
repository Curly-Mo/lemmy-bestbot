import lemmybot from 'lemmy-bot';
import { Youtube, PlaylistItemsResponse, SearchListResponse, SearchResult } from './youtube.js';
import { config } from 'dotenv';

config();
const { LEMMY_INSTANCE, LEMMY_SAUSAGE_USERNAME_OR_EMAIL, LEMMY_SAUSAGE_PASSWORD, SAUSAGE_COMMUNITY, SAUSAGE_CHANNEL_ID } =
  process.env as Record<string, string>;

export class SausageBot extends lemmybot.LemmyBot {
  public static youtube: Youtube = new Youtube();
  constructor(botOptions: lemmybot.BotOptions) {
    super(botOptions);
  }

  start() {
    SausageBot.youtube.authorize(() => super.start());
    // SausageBot.youtube.authorize(() => {
    //   console.info("sausage party");
    //   SausageBot.youtube.getChannelVideos(SAUSAGE_CHANNEL_ID, 5, (err, response) => {
    //     console.log("wut: ", response);
    //   });
    // });
  }

  public static getSausageVideos(callback: {(err?: Error, response?: SearchResult[]): void}): void {
    // const parse = function(err?: Error, response?: SearchResult[]) {
    //   // const parsed = response.data.items.map((item) => {"id": item.id.videoId, "url": item.id.videoId, "title": item.snippet.title});
    //   // console.log("parsed:", parsed);

    //   callback(err, response.data.items);
    // }
    this.youtube.getChannelVideos(SAUSAGE_CHANNEL_ID, 5, callback)
  }

}

export const sausagebot: SausageBot = new SausageBot({
  // Pass configuration options here
  instance: LEMMY_INSTANCE,
  credentials: {
    username: LEMMY_SAUSAGE_USERNAME_OR_EMAIL,
    password: LEMMY_SAUSAGE_PASSWORD,
  },
  dbFile: 'sausage_db.sqlite3',
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
    // secondsBetweenPolls: 60
  },
  schedule: {
    // cronExpression: '* 0 * * * *',
    cronExpression: '*/1 * * * * *',
    timezone: 'America/New_York',
		doTask: (botActions) => {
      botActions.
      SausageBot.getSausageVideos((err, resp) => {
        console.log("nothing", resp);
      });
      return Promise.resolve();
		},
  },
  // handlers: {
  //   post: {
  //     sort: 'New',
  //     handle: ({
  //       postView,
  //       // postView: {
  //       //   post: { id, url },
  //       //   community: { name },
  //       //   counts: { score }
  //       // },
  //       // botActions: { }
  //       botActions,
  //       reprocess
  //     }) => {
  //       // if (postView.counts.upvotes < 25 && !postView.creator.admin) {
  //       //   console.info("score too low:", postView.post.name, "; score:", postView.counts.score, "; upvotes:", postView.counts.upvotes);
  //       //   const now = Date.now();
  //       //   const published = Date.parse(postView.post.published);
  //       //   const diffHours = (now - published) / 3600000;
  //       //   console.info("been reprocessing for ", diffHours, "hours", postView.community.name, postView.post.name, postView.counts.upvotes);
  //       //   if(diffHours > 36) {
  //       //     if(ImportantCommunities.has(postView.community.name)) {
  //       //       console.info("removing post:", postView.community.name, postView.post.name, postView.counts.upvotes);
  //       //       botActions.removePost({post_id: postView.post.id, reason: "The people have voted, and regretfully this post has been deemed `not important`. Better luck next time."})
  //       //     }
  //       //     console.info("no longer attempting to reprocess:", postView.community.name, postView.post.name);
  //       //     return;
  //       //   }
  //       //   console.info("reprocessing:", postView.post.name, "in", BestBot.lowScoreReprocessMinutes, "minutes");
  //       //   reprocess(BestBot.lowScoreReprocessMinutes);
  //       //   return;
  //       // }
  //       // const publishedTimestamp = new Date(postView.post.published);
  //       // const now = new Date();
  //       // const anchor = 1680000000000
  //       // const scheduleMillis = Math.pow(((publishedTimestamp.getTime() - anchor) / (now.getTime() - anchor)), 64)*10000;
  //       // console.info("scheduling handler for:", postView.community.name, postView.post.name, "in", scheduleMillis / 1000, "seconds");

  //       // const videoPostCallback = (err, resp) => {
  //       //   if(err) {
  //       //     console.warn("errored! ", err);
  //       //     console.info("reprocessing:", postView.post.name, "in", BestBot.errorReprocessMinutes, "minutes");
  //       //     reprocess(BestBot.errorReprocessMinutes);
  //       //   } else if(resp) {
  //       //     console.info("Successfully added:", postView.post.name);
  //       //     // console.info("preventing reprocess:", postView.post.name);
  //       //     // preventReprocess();
  //       //   } else {
  //       //     console.info("nothing done for:", postView.post.name);
  //       //   }
  //       // }

  //       // setTimeout(() => BestBot.videoPostHandler(postView, videoPostCallback), scheduleMillis);
  //     }
  //   }
  // },
  markAsBot: false,
});
