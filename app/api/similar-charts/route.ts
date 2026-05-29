import { NextRequest, NextResponse } from 'next/server';
import { generateChart } from '@/lib/ziwei/algorithm';
import { extractFeatures, searchBucket, type SimilarityIndex, type SearchResult } from '@/lib/ziwei/similarity';
import type { BirthInfo } from '@/lib/ziwei/types';
import * as fs from 'fs';
import * as path from 'path';

// Module-level cache for the similarity index
let indexCache: SimilarityIndex | null = null;

function loadIndex(): SimilarityIndex {
  if (indexCache) return indexCache;

  const filePath = path.join(process.cwd(), 'public', 'data', 'similarity-index.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('索引文件不存在，请先运行: npx tsx scripts/build-similarity-index.ts');
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  indexCache = JSON.parse(raw);
  console.log(`📂 已加载相似度索引: ${indexCache!.totalCharts.toLocaleString()} 条, ${indexCache!.bucketCount} 个桶`);
  return indexCache!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.year || !body.month || !body.day || body.hour === undefined) {
      return NextResponse.json(
        { error: '缺少必要的出生信息' },
        { status: 400 }
      );
    }

    const birthInfo: BirthInfo = {
      year: Number(body.year),
      month: Number(body.month),
      day: Number(body.day),
      hour: Number(body.hour),
      gender: body.gender === 'female' ? 'female' : 'male',
      name: body.name,
      province: body.province,
      city: body.city,
      longitude: body.longitude,
    };

    // Validate ranges
    if (birthInfo.year < 1900 || birthInfo.year > 2100) {
      return NextResponse.json({ error: '出生年份超出合理范围' }, { status: 400 });
    }
    if (birthInfo.month < 1 || birthInfo.month > 12) {
      return NextResponse.json({ error: '月份必须在1-12之间' }, { status: 400 });
    }
    if (birthInfo.day < 1 || birthInfo.day > 31) {
      return NextResponse.json({ error: '日期必须在1-31之间' }, { status: 400 });
    }
    if (birthInfo.hour < 0 || birthInfo.hour > 11) {
      return NextResponse.json({ error: '时辰必须在0-11之间' }, { status: 400 });
    }

    // 1. Generate the user's chart
    const chart = generateChart(birthInfo);

    // 2. Load the similarity index
    const index = loadIndex();

    // 3. Extract features from the generated chart
    const features = extractFeatures(chart);

    // 4. Find the matching bucket
    const juIdx = chart.wuxingJu - 2; // 2→0, 3→1, ..., 6→4
    const bucketKey = `${chart.mingGongBranch}-${juIdx}`;
    const bucket = index.buckets[bucketKey];

    if (!bucket || bucket.length === 0) {
      return NextResponse.json({
        chart,
        results: [],
        totalInBucket: 0,
        message: '未找到同类型的命盘数据',
      });
    }

    // 5. Search the bucket for most similar charts
    const topN = Math.min(Number(body.topN) || 10, 50);
    const results: SearchResult[] = searchBucket(features, bucket, topN);

    return NextResponse.json({
      chart,
      results,
      totalInBucket: bucket.length,
      totalCharts: index.totalCharts,
      bucketKey,
      queryFeatures: {
        mingGongBranch: features.mingGongBranch,
        wuxingJu: chart.wuxingJu,
        wuxingJuName: chart.wuxingJuName,
        starPresence: features.starPresence,
        siHua: features.siHua,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('Similar charts error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
