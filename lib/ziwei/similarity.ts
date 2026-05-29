/**
 * 相似命盘搜索算法
 * 基于多维特征加权比较：
 * - 星曜分布 (50%): 14主星 × 12宫位的位置匹配
 * - 命宫位置 (25%): 命宫地支是否相同
 * - 五行局   (15%): 五行局是否相同
 * - 四化格局 (10%): 四化星是否相同
 */

import type { ZiweiChart, Star } from './types';

// 14 major stars — same order as build-similarity-index
export const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
  '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'
];
const STAR_INDEX: Record<string, number> = {};
MAJOR_STARS.forEach((s, i) => { STAR_INDEX[s] = i; });

// ─── 权重配置 ────────────────────────────────────────────────────
export const WEIGHTS = {
  starDistribution: 0.50,  // 星曜分布匹配
  mingGong: 0.25,          // 命宫位置匹配
  wuxingJu: 0.15,          // 五行局匹配
  siHua: 0.10,             // 四化格局匹配
};

// ─── 索引记录类型（与 build-similarity-index.ts 输出一致）─────────
export interface CompactRecord {
  y: number;   // year
  m: number;   // month
  d: number;   // day
  h: number;   // hour branch
  g: number;   // gender 0=male 1=female
  sg: number;  // shenGong branch
  jn: string;  // wuxingJuName
  sp: number[]; // star presence: 14 values, each = palace branch (0-11) or 12=absent
  sh: number[]; // siHua: [禄starIdx, 权starIdx, 科starIdx, 忌starIdx], 14=absent
}

export interface SimilarityIndex {
  totalCharts: number;
  generatedAt: string;
  bucketCount: number;
  buckets: Record<string, CompactRecord[]>;
}

export interface SearchResult {
  record: CompactRecord;
  score: number;
  details: {
    starMatch: number;     // 0-14: how many stars in same position
    starTotal: number;     // always 14
    mingGongMatch: boolean;
    wuxingJuMatch: boolean;
    siHuaMatch: number;    // 0-4: how many sihua stars match
  };
}

// ─── 从 ZiweiChart 提取特征向量 ──────────────────────────────────
export function extractFeatures(chart: ZiweiChart): {
  mingGongBranch: number;
  wuxingJu: number;
  starPresence: number[];
  siHua: number[];
} {
  // Star presence: 14 major stars → which palace branch (0-11) or 12=absent
  const starPresence: number[] = new Array(14).fill(12);
  for (const palace of chart.palaces) {
    if (!palace.stars) continue;
    for (const star of palace.stars) {
      const idx = STAR_INDEX[star.name];
      if (idx !== undefined) {
        starPresence[idx] = palace.branch;
      }
    }
  }

  // SiHua: find the 4 sihua stars
  const sihua: number[] = [14, 14, 14, 14]; // 禄权科忌
  const sihuaOrder: Record<string, number> = { '禄': 0, '权': 1, '科': 2, '忌': 3 };
  for (const palace of chart.palaces) {
    if (!palace.stars) continue;
    for (const star of palace.stars) {
      if (star.siHua && sihuaOrder[star.siHua] !== undefined) {
        const sihuaIdx = sihuaOrder[star.siHua];
        const starIdx = STAR_INDEX[star.name];
        if (starIdx !== undefined) {
          sihua[sihuaIdx] = starIdx;
        }
      }
    }
  }

  return {
    mingGongBranch: chart.mingGongBranch,
    wuxingJu: chart.wuxingJu,
    starPresence,
    siHua: sihua,
  };
}

// ─── 相似度计算 ──────────────────────────────────────────────────

/**
 * 计算两个特征向量的相似度 (0-100)
 */
export function computeSimilarity(
  queryFeatures: {
    mingGongBranch: number;
    wuxingJu: number;
    starPresence: number[];
    siHua: number[];
  },
  record: CompactRecord
): SearchResult {
  // 1. Star distribution: count matching positions
  let starMatch = 0;
  for (let i = 0; i < 14; i++) {
    if (queryFeatures.starPresence[i] === record.sp[i]) {
      starMatch++;
    }
  }
  const starScore = starMatch / 14;

  // 2. MingGong match
  const mingGongMatch = queryFeatures.mingGongBranch === record.sg;
  const mingGongScore = mingGongMatch ? 1 : 0;

  // 3. WuxingJu match (bucket already filtered, but double check)
  const wuxingJuMatch = queryFeatures.wuxingJu === (record.jn ? juNameToNumber(record.jn) : -1);
  const wuxingJuScore = wuxingJuMatch ? 1 : 0;

  // 4. SiHua match: count matching sihua stars
  let siHuaMatch = 0;
  for (let i = 0; i < 4; i++) {
    if (queryFeatures.siHua[i] === record.sh[i]) {
      siHuaMatch++;
    }
  }
  const siHuaScore = siHuaMatch / 4;

  // Weighted total
  const totalScore =
    starScore * WEIGHTS.starDistribution +
    mingGongScore * WEIGHTS.mingGong +
    wuxingJuScore * WEIGHTS.wuxingJu +
    siHuaScore * WEIGHTS.siHua;

  const percentage = Math.round(totalScore * 1000) / 10; // one decimal

  return {
    record,
    score: percentage,
    details: {
      starMatch,
      starTotal: 14,
      mingGongMatch,
      wuxingJuMatch,
      siHuaMatch,
    },
  };
}

/**
 * 在指定桶中搜索最相似的命盘
 */
export function searchBucket(
  queryFeatures: {
    mingGongBranch: number;
    wuxingJu: number;
    starPresence: number[];
    siHua: number[];
  },
  bucket: CompactRecord[],
  topN: number = 10
): SearchResult[] {
  const results: SearchResult[] = [];
  for (const record of bucket) {
    results.push(computeSimilarity(queryFeatures, record));
  }
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN);
}

// ─── 工具函数 ──────────────────────────────────────────────────

function juNameToNumber(name: string): number {
  if (name.includes('水二局')) return 2;
  if (name.includes('木三局')) return 3;
  if (name.includes('金四局')) return 4;
  if (name.includes('土五局')) return 5;
  if (name.includes('火六局')) return 6;
  return -1;
}

export function formatBirthInfo(r: CompactRecord): string {
  const gender = r.g === 0 ? '男' : '女';
  const hourNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return `${r.y}年${r.m}月${r.d}日 ${hourNames[r.h]}时 ${gender}`;
}

export function getStarPresenceDisplay(sp: number[]): string[] {
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return sp.map((branch, i) => {
    if (branch >= 0 && branch <= 11) {
      return `${MAJOR_STARS[i]}@${BRANCHES[branch]}`;
    }
    return null;
  }).filter(Boolean) as string[];
}
