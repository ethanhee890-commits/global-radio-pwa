export type QualityGrade = 'excellent' | 'good' | 'fair' | 'low' | 'unknown' | 'failed';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'autoplay_blocked';

export type StationQualityInput = {
  codec?: string;
  bitrate?: number;
  hls?: 0 | 1;
  lastcheckok?: 0 | 1;
  ssl_error?: 0 | 1;
  url?: string;
  url_resolved?: string;
};

export type StationQuality = {
  score: number;
  grade: QualityGrade;
  label: string;
  reasons: string[];
  isHttps: boolean;
  isLikelyPlayable: boolean;
};

export type RadioStation = StationQualityInput & {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved?: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  language?: string;
  codec?: string;
  bitrate?: number;
  hls?: 0 | 1;
  lastcheckok?: 0 | 1;
  ssl_error?: 0 | 1;
  votes?: number;
  clickcount?: number;
  source?: 'radio-browser' | 'seed';
};

export type SearchStationsParams = {
  query?: string;
  country?: string;
  language?: string;
  tag?: string;
  limit?: number;
};

export type YouTubeAlternateSource = {
  id: string;
  stationuuid: string;
  type: 'youtube_live' | 'youtube_video' | 'youtube_channel';
  youtubeVideoId?: string;
  youtubeChannelId?: string;
  label: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  verificationMethod: 'manual_seed' | 'official_homepage' | 'operator_review';
  sourceUrl: string;
  note?: string;
};

export type RadioStreamSource = {
  type: 'radio_stream';
  stationuuid: string;
  url: string;
  label: 'Radio Stream';
  quality: StationQuality;
};

export type PlaybackSourceRecommendation = {
  preferred: 'direct' | 'youtube_alternate' | 'none';
  direct: RadioStreamSource | null;
  youtubeAlternate: YouTubeAlternateSource | null;
  reason: string;
};

export type StoredStation = Pick<
  RadioStation,
  | 'stationuuid'
  | 'name'
  | 'url'
  | 'url_resolved'
  | 'favicon'
  | 'country'
  | 'countrycode'
  | 'language'
  | 'tags'
  | 'codec'
  | 'bitrate'
  | 'hls'
  | 'lastcheckok'
  | 'ssl_error'
  | 'votes'
  | 'clickcount'
  | 'source'
>;

export type GlobalRadioSettings = {
  preferHttps: boolean;
  hideLowQuality: boolean;
  showYouTubeAlternates: boolean;
};

export type RadioAlarmSettings = {
  enabled: boolean;
  time: string;
  station: StoredStation | null;
  lastTriggeredDate?: string;
};

export type NowPlayingStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';

export type NowPlayingInfo = {
  status: NowPlayingStatus;
  stationName?: string;
  provider?: string;
  programTitle?: string;
  trackTitle?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  sourceUrl?: string;
  checkedAt?: string;
  message: string;
};
