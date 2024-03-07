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
    const future = client.getPosts({
      community_name: community,
      sort: "New",
      limit: 50,
      page_cursor: pageCursor,
    });
    return future.then(resp => {
      if (resp.next_page) {
        return this.getAllPosts(community, client, resp.next_page).then(recursiveResponse =>
          resp.posts.concat(recursiveResponse)
        );
      } else {
        return resp.posts
      }
    });
  }

  public async createPost(client: lemmyjs.LemmyHttp, communityName: string, name?: string, url?: string, body?: string): Promise<lemmybot.PostResponse> {
    const future = client.getCommunity({
      name: communityName,
    });
    return future.then(resp => {
      const communityId = resp.community_view.community.id
      // console.log("communityId:", communityId);
      console.info("Posting", name, url, "to", communityName);
      return client.createPost({
        community_id: communityId,
        name: name,
        url: url,
        body: body,
      });
    });
  }
}
