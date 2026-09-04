export interface GoatCounterUser {
  user: {
    id: number;
    site: number;
    email: string;
    email_verified: boolean;
    totp_enabled: boolean;
    settings: UserSettings;
  };
  token: {
    id: number;
    name: string;
    permissions: number;
    sites: number;
  };
  time: {
    Location: string;
  };
}

export interface UserSettings {
  twenty_four_hours: boolean;
  sunday_starts_week: boolean;
  language: string;
  date_format: string;
  number_format: string;
  timezone: string;
}

export interface HitListStat {
  day: string;
  hourly: number[];
  daily: number;
  weekly?: number;
  monthly?: number;
}

export interface HitList {
  count: number;
  path_id: number;
  path: string;
  event: boolean;
  title: string;
  max: number;
  stats: HitListStat[];
  ref_scheme?: string;
}

export interface HitsResponse {
  hits: HitList[];
  total: number;
  more: boolean;
}

export interface CountTotalResponse {
  total: number;
  total_events: number;
  total_utc: number;
  stats: HitListStat[];
}

export interface HitStat {
  id: string;
  name: string;
  count: number;
  ref_scheme?: string;
}

export interface StatsResponse {
  stats: HitStat[];
  more: boolean;
}

export interface RefsResponse {
  refs: HitStat[];
  more: boolean;
}

export interface PathsResponse {
  paths: GoatCounterPath[];
  more: boolean;
}

export interface GoatCounterPath {
  id: number;
  path: string;
  title: string;
  event: boolean;
}

export type StatsPage =
  | "browsers"
  | "systems"
  | "locations"
  | "languages"
  | "sizes"
  | "campaigns"
  | "toprefs";

export interface Site {
  id: number;
  parent?: number;
  cname?: string;
  code: string;
  link_domain?: string;
  settings: SiteSettings;
  received_data: boolean;
  state: string;
  created_at: string;
  updated_at: string;
  first_hit_at?: string;
}

export interface SiteSettings {
  public: string;
  secret: string;
  allow_counter: boolean;
  allow_bosmang: boolean;
  data_retention: number;
  ignore_ips: string[];
  collect: number;
  collect_regions: string[];
  allow_embed: string[];
}

export interface SitesResponse {
  sites: Site[];
}

export type GoatCounterAuthResult =
  | {
      success: true;
      user: {
        email: string;
      };
    }
  | {
      success: false;
      reason: "invalid_credentials" | "mfa_required" | "unavailable";
    };
