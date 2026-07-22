export interface FeaturedSite {
  id: string;
  name: string;
  presetFile: string;
  emoji: string;
  color: string;
  riskLabel: "주의" | "위험" | "보통";
  riskScore: number;
  summary: string;
  floatPosition: { top: string; left: string };
  floatDelay: number;
}

export const FEATURED_SITES: FeaturedSite[] = [
  {
    id: "kakaot",
    name: "카카오T",
    presetFile: "카카오T_개인정보처리방침.txt",
    emoji: "🚕",
    color: "#FEE500",
    riskLabel: "위험",
    riskScore: 74,
    summary: "위치정보·제3자 제공 조항 다수",
    floatPosition: { top: "18%", left: "12%" },
    floatDelay: 0,
  },
  {
    id: "melon",
    name: "멜론",
    presetFile: "멜론_개인정보처리방침.txt",
    emoji: "🎵",
    color: "#00CD3C",
    riskLabel: "주의",
    riskScore: 61,
    summary: "콘텐츠 이용 제한·면책 조항 확인 필요",
    floatPosition: { top: "28%", left: "68%" },
    floatDelay: 1.2,
  },
  {
    id: "toss",
    name: "토스",
    presetFile: "토스_개인정보처리방침.txt",
    emoji: "💳",
    color: "#0064FF",
    riskLabel: "위험",
    riskScore: 78,
    summary: "금융정보 처리·약관 변경 권한 주의",
    floatPosition: { top: "55%", left: "8%" },
    floatDelay: 0.6,
  },
  {
    id: "netflix",
    name: "넷플릭스",
    presetFile: "넷플릭스_개인정보처리방침.txt",
    emoji: "🎬",
    color: "#E50914",
    riskLabel: "주의",
    riskScore: 65,
    summary: "계정 공유 제한·콘텐츠 권리 포기 조항",
    floatPosition: { top: "62%", left: "72%" },
    floatDelay: 1.8,
  },
  {
    id: "spotify",
    name: "Spotify",
    presetFile: "Spotify_개인정보처리방침.txt",
    emoji: "🎧",
    color: "#1DB954",
    riskLabel: "보통",
    riskScore: 52,
    summary: "사용자 콘텐츠 권리·중재 조항 포함",
    floatPosition: { top: "38%", left: "42%" },
    floatDelay: 0.3,
  },
];

export const FEATURED_SEARCH_ALIASES: Record<string, string> = {
  카카오t: "카카오T",
  kakaot: "카카오T",
  kakao: "카카오T",
  melon: "멜론",
  toss: "토스",
  netflix: "넷플릭스",
  넷플: "넷플릭스",
  spotify: "Spotify",
  스포티파이: "Spotify",
};
