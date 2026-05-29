/**
 * 格局统计脚本 — 遍历 51.8 万命盘，调用 detectPatterns() 统计每个格局出现频率
 *
 * 用法: npx tsx scripts/build-pattern-stats.ts
 * 输出: public/data/pattern-stats.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as readline from 'readline';

// 复用项目内的格局检测（不需要 iztro，只用 types + patterns 纯逻辑）
// 但 patterns.ts 依赖 types.ts，而 types.ts 无运行时代码，所以可以直接 import
import type { ZiweiChart } from '../lib/ziwei/types';
import { detectPatterns } from '../lib/ziwei/patterns';

const SAMPLES_DIR = path.resolve(__dirname, '../samples-out');
const OUTPUT_FILE = path.resolve(__dirname, '../public/data/pattern-stats.json');
const BATCH_SIZE = 8;

// ── 统计结构 ──
interface PatternStat {
  name: string;
  level: string;
  description: string;
  count: number;
  percentage: number;
}

interface PatternStatsOutput {
  totalCharts: number;
  processedAt: string;
  processingTimeMs: number;
  patterns: PatternStat[];
  levelCounts: Record<string, number>;
  chartsWithPatterns: number;
  avgPatternsPerChart: number;
  top10: PatternStat[];
}

// ── 主逻辑 ──
async function main() {
  console.log('🔮 格局统计脚本启动');
  console.log(`   数据源: ${SAMPLES_DIR}`);
  console.log(`   输出: ${OUTPUT_FILE}`);

  // 扫描所有 gzipped JSONL 文件
  const files: string[] = [];
  const years = fs.readdirSync(SAMPLES_DIR).filter(d => d.startsWith('year-')).sort();
  for (const yearDir of years) {
    const yearPath = path.join(SAMPLES_DIR, yearDir);
    if (!fs.statSync(yearPath).isDirectory()) continue;
    const gzFiles = fs.readdirSync(yearPath).filter(f => f.endsWith('.jsonl.gz')).sort();
    for (const f of gzFiles) {
      files.push(path.join(yearPath, f));
    }
  }
  console.log(`   找到 ${files.length} 个 gzipped JSONL 文件`);

  // 统计变量
  let totalCharts = 0;
  const patternCounts = new Map<string, { count: number; level: string; description: string }>();
  let chartsWithPatterns = 0;
  let totalPatternHits = 0;
  const startTime = Date.now();

  // 分批并行处理
  for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
    const batch = files.slice(batchStart, batchStart + BATCH_SIZE);
    const results = await Promise.all(batch.map(f => processFile(f)));

    for (const result of results) {
      totalCharts += result.totalCharts;
      chartsWithPatterns += result.chartsWithPatterns;
      totalPatternHits += result.totalPatternHits;

      for (const [name, data] of result.patternCounts) {
        const existing = patternCounts.get(name);
        if (existing) {
          existing.count += data.count;
        } else {
          patternCounts.set(name, { count: data.count, level: data.level, description: data.description });
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const pct = ((batchStart + batch.length) / files.length * 100).toFixed(1);
    process.stdout.write(`\r   处理中: ${batchStart + batch.length}/${files.length} 文件 (${pct}%) | ${totalCharts.toLocaleString()} 命盘 | ${elapsed}s`);
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n\n✅ 处理完成: ${totalCharts.toLocaleString()} 命盘, ${elapsed}ms`);

  // 排序：按数量降序
  const sortedPatterns = Array.from(patternCounts.entries())
    .map(([name, data]) => ({
      name,
      level: data.level,
      description: data.description,
      count: data.count,
      percentage: Math.round(data.count / totalCharts * 10000) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  // 级别统计
  const levelCounts: Record<string, number> = { excellent: 0, good: 0, neutral: 0, caution: 0 };
  for (const p of sortedPatterns) {
    levelCounts[p.level] = (levelCounts[p.level] || 0) + p.count;
  }

  const output: PatternStatsOutput = {
    totalCharts,
    processedAt: new Date().toISOString(),
    processingTimeMs: elapsed,
    patterns: sortedPatterns,
    levelCounts,
    chartsWithPatterns,
    avgPatternsPerChart: totalCharts > 0 ? Math.round(totalPatternHits / totalCharts * 100) / 100 : 0,
    top10: sortedPatterns.slice(0, 10),
  };

  // 确保输出目录存在
  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`📁 输出文件: ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB)`);

  // 打印 TOP 10
  console.log('\n📊 TOP 10 格局:');
  for (const p of output.top10) {
    const levelEmoji = p.level === 'excellent' ? '⭐' : p.level === 'good' ? '✅' : p.level === 'neutral' ? '🔵' : '⚠️';
    console.log(`   ${levelEmoji} ${p.name}: ${p.count.toLocaleString()} (${p.percentage}%) [${p.level}]`);
  }

  console.log(`\n📈 总计: ${sortedPatterns.length} 种格局, ${chartsWithPatterns.toLocaleString()} 命盘含格局, 平均 ${output.avgPatternsPerChart} 格局/盘`);
}

// ── 处理单个文件 ──
async function processFile(filePath: string): Promise<{
  totalCharts: number;
  chartsWithPatterns: number;
  totalPatternHits: number;
  patternCounts: Map<string, { count: number; level: string; description: string }>;
}> {
  const patternCounts = new Map<string, { count: number; level: string; description: string }>();
  let totalCharts = 0;
  let chartsWithPatterns = 0;
  let totalPatternHits = 0;

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({ input: stream.pipe(gunzip), crlfDelay: Infinity });

    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const record = JSON.parse(line);
        const chart = record.chart as ZiweiChart;
        if (!chart || !chart.palaces || !chart.mingGongBranch && chart.mingGongBranch !== 0) return;

        totalCharts++;
        const patterns = detectPatterns(chart);
        if (patterns.length > 0) {
          chartsWithPatterns++;
          totalPatternHits += patterns.length;
        }

        for (const p of patterns) {
          const existing = patternCounts.get(p.name);
          if (existing) {
            existing.count++;
          } else {
            patternCounts.set(p.name, { count: 1, level: p.level, description: p.description });
          }
        }
      } catch {
        // 跳过解析失败的行
      }
    });

    rl.on('close', () => resolve({ totalCharts, chartsWithPatterns, totalPatternHits, patternCounts }));
    rl.on('error', reject);
    gunzip.on('error', reject);
    stream.on('error', reject);
  });
}

main().catch(console.error);
