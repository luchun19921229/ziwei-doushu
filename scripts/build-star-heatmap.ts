#!/usr/bin/env npx tsx
/**
 * 构建星曜分布热力图数据
 * 读取 samples-out/ 下所有 gzipped JSONL 文件
 * 输出 public/data/star-heatmap.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as readline from 'readline';

const SAMPLES_DIR = path.join(process.cwd(), 'samples-out');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'star-heatmap.json');

// 14 major stars
const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
  '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'
];

// 12 地支
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 12 宫名
const PALACE_NAMES = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫',
  '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'
];

type Counts = Record<string, Record<string, number>>;

async function processFile(filePath: string, starPalace: Counts, total: { n: number }) {
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
        if (!chart?.palaces) return;
        total.n++;

        for (const palace of chart.palaces) {
          if (!palace.stars) continue;
          const branchIdx = palace.branch;
          if (branchIdx < 0 || branchIdx > 11) continue;
          const branchName = BRANCHES[branchIdx];

          for (const star of palace.stars) {
            if (MAJOR_STARS.includes(star.name)) {
              if (!starPalace[star.name]) starPalace[star.name] = {};
              starPalace[star.name][branchName] = (starPalace[star.name][branchName] || 0) + 1;
            }
          }
        }
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

  const starPalace: Counts = {};
  const total = { n: 0 };
  const startTime = Date.now();

  const BATCH_SIZE = 8; // parallel file processing
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏳ [${Math.min(i + BATCH_SIZE, files.length)}/${files.length}] ${elapsed}s 已处理 ${total.n.toLocaleString()} 条`);
    const results = await Promise.allSettled(batch.map(f => processFile(f, starPalace, total)));
    for (const r of results) {
      if (r.status === 'rejected') console.error(`❌ ${r.reason}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ 处理完成: ${total.n.toLocaleString()} 条命盘, 耗时 ${elapsed}s`);

  // Compute totals
  const starTotal: Record<string, number> = {};
  const palaceTotal: Record<string, number> = {};
  for (const star of MAJOR_STARS) {
    starTotal[star] = 0;
    for (const branch of BRANCHES) {
      const count = starPalace[star]?.[branch] || 0;
      starTotal[star] += count;
      palaceTotal[branch] = (palaceTotal[branch] || 0) + count;
    }
  }

  const output = {
    totalCharts: total.n,
    generatedAt: new Date().toISOString(),
    stars: MAJOR_STARS,
    palaces: BRANCHES,
    palaceNames: PALACE_NAMES,
    starPalace,
    starTotal,
    palaceTotal,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));
  console.log(`💾 已保存到 ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
