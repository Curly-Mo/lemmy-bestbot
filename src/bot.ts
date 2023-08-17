import lemmybot from 'lemmy-bot';
import { Youtube } from './youtube.js';
import { config } from 'dotenv';

config();
// const { LEMMY_INSTANCE, LEMMY_USERNAME_OR_EMAIL, LEMMY_PASSWORD, COMMUNITY, API_KEY } =
const { LEMMY_INSTANCE, LEMMY_USERNAME_OR_EMAIL, LEMMY_PASSWORD, COMMUNITY } =
  process.env as Record<string, string>;

export const youtube = new Youtube();
// const youtube = Youtube.create();

export const bestbot = new lemmybot.LemmyBot({
  // Pass configuration options here
  instance: LEMMY_INSTANCE,
  credentials: {
    username: LEMMY_USERNAME_OR_EMAIL,
    password: LEMMY_PASSWORD,
  },
  // dbFile: 'db.sqlite3',
  federation: {
    allowList: [
      {
        instance: LEMMY_INSTANCE,
        communities: [COMMUNITY],
      },
    ],
  },
  handlers: {
    post: (res) => {
      // console.log(res.postView.post.name);
      // console.log(res.postView.post.url);
      // console.log(res.postView.post.id);
      // youtube.updatePlaylist([res.postView.post.url])
      if(youtube.auth !== undefined) {
        youtube.test([res.postView.post.url])
      }
    }
  },
  markAsBot: false,
});

