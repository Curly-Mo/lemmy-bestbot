import lemmyjs from 'lemmy-js-client';
import lemmybot from 'lemmy-bot';


export class LemmyWrapper {
  // client: lemmyjs.LemmyHttp;
  constructor() {
    // this.client = new lemmyjs.LemmyHttp(
    //   `http${secure ? 's' : ''}://${this.#instance}`
    // );
    // this.__httpClient__.setHeaders({ 'user-agent': 'Lemmy-Bot/0.6.1' });
    return this;
  }

  public async getPosts(community: string, client: lemmyjs.LemmyHttp, sort: lemmyjs.SortType = "New", limit: number = 50): Promise<lemmybot.PostView[]> {
    const future = client.getPosts({
      community_name: community,
      sort: sort,
      limit: limit,
    });
    return future.then(resp => resp.posts);
  }

  public async getAllPosts(community: string, client: lemmyjs.LemmyHttp, pageCursor?: lemmyjs.PaginationCursor): Promise<lemmybot.PostView[]> {
    console.log("page_cursor:", pageCursor);
    const future = client.getPosts({
      community_name: community,
      sort: "New",
      limit: 50,
      page_cursor: pageCursor,
    });
    return future.then(resp => {
      console.log("has_next? ", resp.next_page);
      if(resp.next_page) {
        return this.getAllPosts(community, client, resp.next_page).then(recursiveResponse =>
          resp.posts.concat(recursiveResponse)
        );
      } else {
        return resp.posts
      }
    });
  }

  public async cleanUpRecs(client: lemmyjs.LemmyHttp, community: string, belowScore: number = 1): Promise<lemmyjs.PostResponse[]> {
    const postsFuture = this.getAllPosts(community, client);
    return postsFuture.then(posts => {
      return Promise.all(posts
        .filter(post => !post.post.deleted)
        .filter(post => post.counts.score < belowScore).map(badPost => {
          console.info("Deleting", badPost.post.name, "from", community);
          return client.deletePost({
            post_id: badPost.post.id,
            deleted: true
          });
        }));
    });
  }
}
