import lemmybot from 'lemmy-bot';
import {config} from 'dotenv';
import {ScrapeTube, Recommendation} from './scrapetube.js';
import {LemmyWrapper} from './lemmywrapper.js';
import {Youtube} from './youtube.js';
import lemmyjs from 'lemmy-js-client';

config();
const {LEMMY_INSTANCE, LEMMY_ALGORITHM_USERNAME_OR_EMAIL, LEMMY_ALGORITHM_PASSWORD} =
  process.env as Record<string, string>;

const BotPlaygroundCommunity: string = "thealgorithm";

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

export class AlgorithmBot extends lemmybot.LemmyBot {
  public static scrapetube: ScrapeTube = new ScrapeTube();
  public static youtube: Youtube = new Youtube();
  public static lemmyWrapper: LemmyWrapper = new LemmyWrapper();
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

  public static async postRec(botActions: lemmybot.BotActions, client: lemmyjs.LemmyHttp): Promise<lemmyjs.PostResponse> {
    const community = this.chooseCommunity();
    const postsFuture = this.lemmyWrapper.getAllPosts(BotPlaygroundCommunity, client);
    const recsFuture = this.getRecs(community);
    return Promise.all([postsFuture, recsFuture]).then(results => {
      const posts = results[0];
      const recs = results[1];
      // console.log("POSTS:", posts.length);
      // console.log("RECS:", recs.length);
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
          // .then(post => {
          //   setTimeout(function() {
          //     botActions.votePost({post_id: post.post_view.post.id, score: 0});
          //   }, 10000);
          //   return post;
          // });
        }
      }
    });
  }

  public static async processRecPosts(botActions: lemmybot.BotActions, client: lemmyjs.LemmyHttp): Promise<lemmyjs.PostResponse[]> {
    const postsFuture = this.lemmyWrapper.getAllPosts(BotPlaygroundCommunity, client);
    return postsFuture.then(async posts => {
      const cleanupFuture = this.cleanUpRecs(client, posts)
      const promoteFuture = this.promoteRecs(client, posts)
      const responses = await Promise.all([cleanupFuture, promoteFuture]);
      return responses.flat();
    });
  }

  public static async cleanUpRecs(client: lemmyjs.LemmyHttp, posts: lemmyjs.PostView[], belowScore: number = 1): Promise<lemmyjs.PostResponse[]> {
    return Promise.all(posts
      .filter(post => !post.post.deleted)
      .filter(post => post.counts.score < belowScore).map(badPost => {
        console.info("Deleting", badPost.post.name, "from", badPost.community.name);
        return client.deletePost({
          post_id: badPost.post.id,
          deleted: true
        });
      }));
  }

  public static async promoteRecs(client: lemmyjs.LemmyHttp, posts: lemmyjs.PostView[], aboveScore: number = 1): Promise<lemmyjs.PostResponse[]> {
    return Promise.all(posts
      .filter(post => !post.post.deleted)
      .filter(post => post.counts.score > aboveScore).map(goodPost => {
        const communityLink = this.extractCommunityLink(goodPost.post.body);
        const communityName = this.extractCommunityName(goodPost.post.body);
        console.info("Promoting", goodPost.post.name, "from", goodPost.community.name, "to", communityLink);
        return this.lemmyWrapper.createPost(
          client,
          communityName,
          goodPost.post.name,
          goodPost.post.url,
          `I am a bot, beep boop. I think this video might fit in here at ${communityLink}  \n\nIf I've done goofed, just downvote this post and I will remove it and learn from my mistakes.`,
        ).then(resp =>
          client.deletePost({
            post_id: goodPost.post.id,
            deleted: true
          })
        );
      }));
  }

  public static communityLink(communityName: string): string {
    return `!${communityName}@lemmy.best`;
  }

  public static chooseCommunity(): string {
    const communities = Array.from(CommunityToPlaylistId.keys());
    return communities[Math.floor(Math.random() * communities.length)];
  }

  public static extractCommunityLink(text: string): string {
    const matches = text.match(/.*(\!\w+\@(\w+\.\w+)+).*/);
    // console.log("matches:", matches);
    return matches[1];
  }

  public static extractCommunityName(text: string): string {
    const matches = text.match(/.*\!(\w+)\@(\w+\.\w+)+.*/);
    // console.log("nameMatches:", matches);
    return matches[1];
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
  schedule: [
    {
      cronExpression: '0 13 9 * * *',
      timezone: 'America/New_York',
      doTask: (options: {botActions: lemmybot.BotActions; __httpClient__: lemmyjs.LemmyHttp;}) => {
        return AlgorithmBot.postRec(options.botActions, options.__httpClient__)
          // .then(post => options.botActions.votePost({post_id: post.post_view.post.id, score: 0}))
          .then(_ => null);
      },
    },
    {
      cronExpression: '0 0,30 * * * *',
      timezone: 'America/New_York',
      doTask: (options: {botActions: lemmybot.BotActions; __httpClient__: lemmyjs.LemmyHttp;}) => {
        return AlgorithmBot.processRecPosts(options.botActions, options.__httpClient__)
          .then(_ => null);
      },
    }
  ],
  markAsBot: false,
});
