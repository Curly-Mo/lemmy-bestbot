import lemmybot from 'lemmy-bot';
import { Youtube, SearchResult } from './youtube.js';
import { config } from 'dotenv';
import lemmyjs from 'lemmy-js-client';

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
  }

  public static async postSausages(botActions: lemmybot.BotActions, lemmyHttp: lemmyjs.LemmyHttp): Promise<lemmyjs.PostResponse> {
    const postsFuture = this.getPosts(SAUSAGE_COMMUNITY, lemmyHttp);
    const videosFuture = this.getSausageVideos();
    return Promise.all([postsFuture, videosFuture]).then(results => {
      const posts = results[0];
      const videos = results[1];
      const postVideoIds = new Set(posts.map(postView => postView.post).filter(post => this.youtube.isYoutubeUrl(post.url)).map(post => this.youtube.extractVideoId(post.url)));
      const communityId = posts[0].community.id;
      for (const video of videos) {
        const repost = postVideoIds.has(video.id.videoId);
        if(!repost) {
          const videoUrl = this.youtube.buildVideoUrl(video.id.videoId);
          const thumbnailUrl = this.youtube.buildThumbnailUrl(video.id.videoId);
          console.info("Posting", video.snippet.title, videoUrl, "to", SAUSAGE_COMMUNITY);
          return botActions.createPost({
            community_id: communityId,
            name: video.snippet.title,
            url: videoUrl,
            body: `Mr. Sausage makes ordinary ${video.snippet.title}`,
            // TODO: manually set thumbnail until lemmy properly handles previews
            custom_thumbnail: thumbnailUrl,
          });
        }
        return;
      }
    });
  }

  public static getSausageVideos(): Promise<SearchResult[]> {
    const youtube = this.youtube;
    return new Promise((resolve, reject) => {
      youtube.getChannelVideos(SAUSAGE_CHANNEL_ID, 1, (err, videos) => {
        if(err) {
          return reject(err);
        }else{
          resolve(videos);
        }
      });
    });
  }

  public static async getPosts(community: string, lemmyHttp: lemmyjs.LemmyHttp): Promise<lemmybot.PostView[]> {
    const future = lemmyHttp.getPosts({
      community_name: community,
      sort: "New",
    });
    return future.then(resp => resp.posts);
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
    cronExpression: '0 25 * * * *',
    timezone: 'America/New_York',
		doTask: (options) => {
      return SausageBot.postSausages(options.botActions, options.__httpClient__)
        .then(_ => null);
		},
  },
  markAsBot: false,
});
