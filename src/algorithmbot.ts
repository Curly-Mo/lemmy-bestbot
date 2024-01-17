import lemmybot from 'lemmy-bot';
import {config} from 'dotenv';
import {ScrapeTube, Recommendation} from './scrapetube.js';
import {Youtube} from './youtube.js';
import {LemmyHttp} from 'lemmy-js-client';

config();
const {LEMMY_INSTANCE, LEMMY_ALGORITHM_USERNAME_OR_EMAIL, LEMMY_ALGORITHM_PASSWORD} =
  process.env as Record<string, string>;

const BotPlaygroundCommunity: string = "thealgorithm";

const CommunityToPlaylistId: Map<string, string> = new Map(Object.entries({
  "importantvideos": "PLHwBlZp_DJfmuZceDJJsIVbal9JO_hteM",
  "bideos": "PLHwBlZp_DJfl2vj6hjEmbmT7LVk9YD0bX",
  // "sketchy": "PLHwBlZp_DJfkHuKW-XFJT4XEafTIRnRVQ",
  // "worksofart": "PLHwBlZp_DJfkC1gPkrRPtxGxeeYJAOCwh",
  // "aminals": "PLHwBlZp_DJfnndZCZdfyAwA9lNpxGO4v0",
  // "musicbideos": "PLHwBlZp_DJfnfMU7n5IT-8CfPRbJAyb-L",
  // "norm": "PLHwBlZp_DJfkB6Tm-CKNe_IplzaMIXtYE",
  // "standup": "PLHwBlZp_DJflhO0ifYF1mXEAAal58-E0o",
  "mealtimevideos": "PLHwBlZp_DJfn_dCiWOFHIVY5SHf3iBF_D"
}));

export class AlgorithmBot extends lemmybot.LemmyBot {
  public static scrapetube: ScrapeTube = new ScrapeTube();
  public static youtube: Youtube = new Youtube();
  public static minViewCount = 400000;
  constructor(botOptions: lemmybot.BotOptions) {
    super(botOptions);
  }

  start() {
    AlgorithmBot.youtube.authorize(() => super.start());
    // AlgorithmBot.getRecs("importantvideos")
    //   .then(recs => console.log("filtered:", recs));
  }

  public static async getRecs(community: string): Promise<Array<Recommendation>> {
    console.info("fetching recs for community ", community, "...");
    const playlistId = CommunityToPlaylistId.get(community);
    const recsFuture = AlgorithmBot.scrapetube.getPlaylistRelatedVideos(playlistId);
    // return recsFuture.then(recs => recs.filter(rec => rec.rec.uploadDate);
    return recsFuture
      .then(recs =>
        recs
          .filter(rec => rec.rec.uploadDate == undefined || !rec.rec.uploadDate.includes("hour"))
          .filter(rec => rec.rec.uploadDate == undefined || !rec.rec.uploadDate.includes("day"))
          .filter(rec => rec.rec.uploadDate == undefined || !rec.rec.uploadDate.includes("weeks"))
          .filter(rec => rec.rec.viewCount > this.minViewCount)
      );
  }

  public static async postRec(botActions: lemmybot.BotActions, lemmyHttp: LemmyHttp): Promise<void> {
    const community = this.chooseCommunity();
    const postsFuture = this.getPosts(BotPlaygroundCommunity, lemmyHttp);
    const recsFuture = this.getRecs(community);
    return Promise.all([postsFuture, recsFuture]).then(results => {
      const posts = results[0];
      const recs = results[1];
      // console.log("POSTS:", posts);
      // console.log("RECS:", recs);
      const postVideoIds = new Set(posts.map(postView => postView.post).filter(post => this.youtube.isYoutubeUrl(post.url)).map(post => this.youtube.extractVideoId(post.url)));
      // console.log("postVideoIds:", postVideoIds);
      const communityId = posts[0].community.id;
      // console.log("communityId:", communityId);
      for (const rec of recs) {
        console.log("REC:", rec);
        const repost = postVideoIds.has(rec.rec.id);
        if (!repost) {
          const videoUrl = this.youtube.buildVideoUrl(rec.rec.id);
          console.info("Posting", rec.rec.title, videoUrl, "to", BotPlaygroundCommunity);
          return botActions.createPost({
            community_id: communityId,
            name: rec.rec.title,
            url: videoUrl,
            body: `I am a bot, beep boop. I think this video might fit in over at ${this.communityLink(community)}`,
          });
        }
      }
    });
  }

  public static async getPosts(community: string, lemmyHttp: LemmyHttp): Promise<lemmybot.PostView[]> {
    const future = lemmyHttp.getPosts({
      community_name: community,
      sort: "New",
      limit: 50,
    });
    return future.then(resp => resp.posts);
  }

  public static communityLink(communityName: string): string {
    return `!${communityName}@lemmy.best`;
  }

  public static chooseCommunity(): string {
    const communities = Array.from(CommunityToPlaylistId.keys());
    return communities[Math.floor(Math.random() * communities.length)];
  }

}

export const algorithmbot: AlgorithmBot = new AlgorithmBot({
  // Pass configuration options here
  instance: LEMMY_INSTANCE,
  credentials: {
    username: LEMMY_ALGORITHM_USERNAME_OR_EMAIL,
    password: LEMMY_ALGORITHM_PASSWORD,
  },
  dbFile: 'algorithm_db.sqlite3',
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
    cronExpression: '0 0 9,10,11 * * *',
    timezone: 'America/New_York',
    doTask: (options: {botActions: lemmybot.BotActions; __httpClient__: LemmyHttp;}) => {
      return AlgorithmBot.postRec(options.botActions, options.__httpClient__);
    },
  },
  markAsBot: false,
});
