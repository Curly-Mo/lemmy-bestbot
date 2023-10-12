import { Client, Playlist, VideoRelated, VideoCompact, Video } from "youtubei";


export interface Recommendation {
  rec: VideoCompact;
  sources: Array<Video>;
  count: Number;
  score: Number;
}

// interface VideoAndRelated {
//   video: Video;
//   related: Array<VideoCompact>;
// }

// class VideoAndRelated implements VideoAndRelated {
//   video: Video;
//   related: Array<VideoCompact>;
// }

// const wut = new VideoAndRelated();

export class ScrapeTube {
  client: Client;
  constructor() {
    this.client = new Client();
    return this;
  }

  public async getPlaylistRelatedVideos(playlistId: string): Promise<Array<Recommendation>> {
    const playlist: Playlist = await this.client.getPlaylist(playlistId);
    // console.info("playlist:", playlist);
    // console.info("items", playlist.videos.items);
    const videoFutures = playlist.videos.items.map(item => item.getVideo());
    // const relatedFutures = videoFutures.map(future => future.then(this.getAllRelated));
    const relatedFutures = videoFutures.map(future =>
      future.then(video => this.getAllRelated(video as Video).then(related => {
        return {video: video, related: related}
      }))
    );
    const relatedVideos = await Promise.all(relatedFutures);

    // console.info("relatedStuff", relatedVideos);
    const sourceVideosMap = new Map<String, Video>;
    const videosMap = new Map<String, VideoCompact>;
    const relatedMap = new Map<String, Array<String>>;
    relatedVideos.map(videoAndRelated => videoAndRelated.related.map(related => {
      videosMap.set(related.id, related);
      sourceVideosMap.set(videoAndRelated.video.id, videoAndRelated.video as Video);
      if (relatedMap.has(related.id)) {
        relatedMap.get(related.id).push(videoAndRelated.video.id);
      } else {
        relatedMap.set(related.id, [videoAndRelated.video.id]);
      }
    }));
    // console.info("relatedMap", relatedMap);

    const sortedRecKeys = Array.from(relatedMap.keys())
    .sort((a, b) => relatedMap.get(a).length - relatedMap.get(b).length).reverse();
    // console.log("Sorted:", sortedRecKeys);
    
    const recs = sortedRecKeys.map(recId => {
      const rec = videosMap.get(recId);
      const sources =
        relatedMap.get(recId).map(sourceId => sourceVideosMap.get(sourceId));
      return {rec: rec, sources: sources, count: sources.length, score: sources.length};
    });
    console.log("RECS:", recs);

    // const relatedMap = new Map<String, Array<VideoCompact>>;
    // relatedVideos.flatMap(related => related).map(related => {
    //   if (relatedMap.has(related.id)) {
    //     relatedMap.get(related.id).push(related);
    //   } else {
    //     relatedMap.set(related.id, [related]);
    //   }
    // });
    // console.info("relatedMap", relatedMap);
    return Promise.resolve(recs);
  }

  // public async getAllRelated(video: Video): Promise<VideoAndRelated> {
  //   if (video.related.continuation) {
  //     return video.related.next(0)
  //     .then(items => video.related.items.concat(items))
  //     .then(items => items.map(item => item as VideoCompact))
  //     .then(related => <VideoAndRelated>{video: video, related: related});
  //   } else {
  //     return Promise.resolve(<VideoAndRelated>{video: video, related: video.related.items});
  //   }
  // }

  public async getAllRelated(video: Video): Promise<VideoCompact[]> {
    // return video.related.items.map(rel => rel as VideoCompact);
    return video.related.next(10)
    .then(items => video.related.items)
    .catch(error => {
      console.log("errored!", error);
      return video.related.items;
    })
    .then(items => items.map(item => item as VideoCompact));
  }
}
