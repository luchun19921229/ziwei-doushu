#!/usr/bin/env npx tsx
/**
 * 构建相似命盘搜索索引
 * 读取 samples-out/ 下所有 gzipped JSONL 文件
 * 按 (命宫地支 × 五行局) 分桶，每条记录压缩为特征向量
 * 输出 public/data/similarity-index.json
 *
 * 设计思路:
 * 518K命盘无法全部加载到前端。
 * 索引按分桶存储，API端只加载相关桶，大幅减少比较次数。
 * 每条记录 ~60 字节 → 60桶 × ~8600条 ≈ 每桶 ~520KB
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as readline from 'readline';

const SAMPLES_DIR = path.join(process.cwd(), 'samples-out');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'similarity-index.json');

// 14 major stars — same order as heatmap
const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
  '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'
];
const STAR_INDEX: Record<string, number> = {};
MAJOR_STARS.forEach((s, i) => { STAR_INDEX[s] = i; });

// Bucket key: `${mingGongBranch}-${wuxingJu}`
// mingGongBranch: 0-11
// wuxingJu: 2,3,4,5,6 → map to 0-4

function juToIndex(ju: number): number {
  // 2→0, 3→1, 4→2, 5→3, 6→4
  return ju - 2;
}

interface CompactRecord {
  /** year (e.g. 1990) */
  y: number;
  /** month 1-12 */
  m: number;
  /** day 1-31 */
  d: number;
  /** hour branch 0-11 */
  h: number;
  /** gender 0=male 1=female */
  g: number;
  /** shenGong branch 0-11 */
  sg: number;
  /** wuxingJuName */
  jn: string;
  /** star presence: 14 values, each = palace branch (0-11) where star sits, 12 = absent */
  sp: number[];
  /** siHua: [化禄starIdx, 化权starIdx, 化科starIdx, 化忌starIdx], 14=absent */
  sh: number[];
}

async function processFile(filePath: string, buckets: Map<string, CompactRecord[]>) {
  return new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({
      input: stream.pipe(gunzip),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const record = JSON.parse(line);
        const chart = record.chart;
        if (!chart?.palaces || !chart.birthInfo) return;

        const bi = chart.birthInfo;
        const mingGongBranch: number = chart.mingGongBranch;
        const wuxingJu: number = chart.wuxingJu;
        const shenGongBranch: number = chart.shenGongBranch ?? 0;

        if (mingGongBranch < 0 || mingGongBranch > 11) return;
        const juIdx = juToIndex(wuxingJu);
        if (juIdx < 0 || juIdx > 4) return;

        // Build star presence: for each of 14 major stars, which palace (0-11) or 12=absent
        const starPresence: number[] = new Array(14).fill(12);
        for (const palace of chart.palaces) {
          const branch = palace.branch;
          if (branch < 0 || branch > 11) continue;
          if (!palace.stars) continue;
          for (const star of palace.stars) {
            const idx = STAR_INDEX[star.name];
            if (idx !== undefined) {
              starPresence[idx] = branch;
            }
          }
        }

        // Build siHua: find the 4 sihua stars from chart
        // siHua comes from the star's siHua field
        const sihua: number[] = [14, 14, 14, 14]; // 禄权科忌, 14=absent
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

        const record2: CompactRecord = {
          y: bi.year,
          m: bi.month,
          d: bi.day,
          h: bi.hour,
          g: bi.gender === 'female' ? 1 : 0,
          sg: shenGongBranch,
          jn: chart.wuxingJuName || '',
          sp: starPresence,
          sh: sihua,
        };

        const bucketKey = `${mingGongBranch}-${juIdx}`;
        if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
        buckets.get(bucketKey)!.push(record2);
      } catch {
        // skip malformed lines
      }
    });

    rl.on('close', resolve);
    rl.on('error', reject);
    stream.on('error', reject);
  });
}

async function main() {
  console.log('🔍 扫描 samples-out/ 目录...');

  // Collect all gzipped JSONL files
  const files: string[] = [];
  const yearDirs = fs.readdirSync(SAMPLES_DIR).filter(d => d.startsWith('year-'));
  for (const yearDir of yearDirs) {
    const yearPath = path.join(SAMPLES_DIR, yearDir);
    if (!fs.statSync(yearPath).isDirectory()) continue;
    const gzFiles = fs.readdirSync(yearPath)
      .filter(f => f.endsWith('.jsonl.gz'))
      .map(f => path.join(yearPath, f));
    files.push(...gzFiles);
  }

  files.sort();
  console.log(`📁 找到 ${files.length} 个数据文件`);

  const buckets = new Map<string, CompactRecord[]>();
  let totalRecords = 0;
  const startTime = Date.now();

  const BATCH_SIZE = 8;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏳ [${Math.min(i + BATCH_SIZE, files.length)}/${files.length}] ${elapsed}s 已处理 ${totalRecords.toLocaleString()} 条`);
    const results = await Promise.allSettled(batch.map(f => processFile(f, buckets)));
    for (const r of results) {
      if (r.status === 'rejected') console.error(`❌ ${r.reason}`);
    }
    // Count records in this batch
    for (const [, arr] of buckets) {
      totalRecords = 0;
      for (const [, a] of buckets) totalRecords += a.length;
      break;
    }
  }

  // Final count
  totalRecords = 0;
  for (const [, arr] of buckets) totalRecords += arr.length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ 处理完成: ${totalRecords.toLocaleString()} 条命盘, 耗时 ${elapsed}s`);

  // Build output: convert Map to Record
  const bucketRecord: Record<string, CompactRecord[]> = {};
  for (const [key, arr] of buckets) {
    bucketRecord[key] = arr;
  }

  // Print bucket stats
  console.log('\n📊 分桶统计:');
  const bucketStats: Array<{ key: string; count: number; mingGong: string; ju: string }> = [];
  const JU_NAMES = ['水二局', '木三局', '金四局', '土五局', '火六局'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  for (const [key, arr] of buckets) {
    const [mg, ji] = key.split('-').map(Number);
    bucketStats.push({ key, count: arr.length, mingGong: BRANCHES[mg], ju: JU_NAMES[ji] });
  }
  bucketStats.sort((a, b) => b.count - a.count);
  for (const s of bucketStats.slice(0, 10)) {
    console.log(`  ${s.mingGong}宫 ${s.ju}: ${s.count.toLocaleString()} 条`);
  }
  console.log(`  ... 共 ${bucketStats.length} 个桶`);

  const output = {
    totalCharts: totalRecords,
    generatedAt: new Date().toISOString(),
    bucketCount: Object.keys(bucketRecord).length,
    buckets: bucketRecord,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));
  const sizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`\n💾 已保存到 ${OUTPUT_FILE} (${sizeMB} MB)`);
}

main().catch(console.error);
