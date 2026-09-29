type TweetMedia =
  | { kind: "image"; src: string; width: number; height: number }
  | {
      kind: "video";
      src: string;
      poster: string;
      width: number;
      height: number;
    };

export type Tweet = {
  id: string;
  href: string;
  name: string;
  handle: string;
  avatarSrc: string;
  text: string;
  dateIso: string;
  date: string;
  media?: TweetMedia;
};

const TWEETS: Record<string, Tweet> = {};

export function getTweet(id: string): Tweet | undefined {
  return TWEETS[id];
}
