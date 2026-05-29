'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import BirthForm from '@/components/BirthForm';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, PALACE_NAMES_ORDER, STEMS } from '@/lib/ziwei/constants';

interface SimilarResult {
  record: {
    y: number; m: number; d: number; h: number; g: number;
    sg: number; jn: string; sp: number[]; sh: number[];
  };
  score: number;
  details: {
    starMatch: number;
    starTotal: number;
    mingGongMatch: boolean;
    wuxingJuMatch: boolean;
    siHuaMatch: number;
  };
}

interface SearchResponse {
  chart: ZiweiChart;
  results: SimilarResult[];
  totalInBucket: number;
  totalCharts: number;
  bucketKey: string;
  queryFeatures: {
    mingGongBranch: number;
    wuxingJu: number;
    wuxingJuName: string;
    starPresence: number[];
    siHua: number[];
  };
  error?: string;
}

const MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
  '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'
];

export default function SimilarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [showChart, setShowChart] = useState(false);

  const handleSearch = async (info: BirthInfo) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/similar-charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '搜索失败');
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-lg font-bold">
            紫微命盘
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              首页
            </button>
            <button
              onClick={() => router.push('/chart')}
              className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              排盘
            </button>
            <button
              onClick={() => router.push('/heatmap')}
              className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors"
            >
              热力图
            </button>
            <button
              onClick={() => router.push('/similar')}
              className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground"
            >
              相似搜索
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-16 px-4 max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">相似命盘搜索</h1>
          <p className="text-muted-foreground">
            输入出生信息，在 51.8 万命盘数据库中搜索最相似的命盘
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            基于星曜分布、命宫位置、五行局、四化格局的多维相似度算法
          </p>
        </div>

        {/* 搜索表单 */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <BirthForm onSubmit={handleSearch} loading={loading} />
          </div>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">正在搜索相似命盘...</p>
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-lg bg-destructive/10 text-destructive text-center">
            {error}
          </div>
        )}

        {/* 搜索结果 */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 概览统计 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard label="总搜索范围" value={`${result.totalCharts.toLocaleString()}`} sub="命盘" />
              <StatCard label="同类型命盘" value={`${result.totalInBucket.toLocaleString()}`} sub="同命宫+五行局" />
              <StatCard label="匹配结果" value={`${result.results.length}`} sub="条" />
              <StatCard label="最高相似度" value={result.results.length > 0 ? `${result.results[0].score}%` : '-'} sub="" />
            </div>

            {/* 查询命盘特征 */}
            <div className="bg-card rounded-xl border border-border p-5 mb-6">
              <h3 className="font-semibold mb-3">您的命盘特征</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">命宫: </span>
                  <span className="font-medium">{BRANCHES[result.queryFeatures.mingGongBranch]}宫</span>
                </div>
                <div>
                  <span className="text-muted-foreground">五行局: </span>
                  <span className="font-medium">{result.queryFeatures.wuxingJuName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">身宫: </span>
                  <span className="font-medium">{BRANCHES[result.chart.shenGongBranch]}宫</span>
                </div>
                <div>
                  <span className="text-muted-foreground">紫微: </span>
                  <span className="font-medium">{BRANCHES[result.chart.ziweiPos]}宫</span>
                </div>
              </div>
              {/* 星曜分布 */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {MAJOR_STARS.map((star, i) => {
                  const branch = result.queryFeatures.starPresence[i];
                  const branchName = branch >= 0 && branch <= 11 ? BRANCHES[branch] : '无';
                  return (
                    <span key={star} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                      {star}→{branchName}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 切换: 命盘详情 / 相似列表 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowChart(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !showChart ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                相似命盘 ({result.results.length})
              </button>
              <button
                onClick={() => setShowChart(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showChart ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                我的命盘
              </button>
            </div>

            {!showChart ? (
              /* 相似命盘列表 */
              <div className="space-y-3">
                {result.results.map((r, idx) => (
                  <SimilarCard key={idx} result={r} rank={idx + 1} />
                ))}
                {result.results.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    未找到相似命盘
                  </div>
                )}
              </div>
            ) : (
              /* 用户命盘简要展示 */
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-4">命盘详情</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                  {result.chart.palaces.map((palace) => (
                    <div
                      key={palace.branch}
                      className={`p-2 rounded-lg border ${
                        palace.isMingGong ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="font-medium text-sm mb-1">
                        {PALACE_NAMES_ORDER[palace.branch]}
                        <span className="text-muted-foreground ml-1">
                          {BRANCHES[palace.branch]}
                          {STEMS[palace.stem]}
                        </span>
                      </div>
                      {palace.isMingGong && <div className="text-[10px] text-primary mb-1">命宫</div>}
                      {palace.isShenGong && <div className="text-[10px] text-blue-500 mb-1">身宫</div>}
                      <div className="flex flex-wrap gap-0.5">
                        {palace.stars.map((star, si) => (
                          <span
                            key={si}
                            className={`inline-block px-1 rounded ${
                              star.type === 'major'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                                : star.type === 'sha'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                          >
                            {star.name}
                            {star.siHua && <span className="ml-0.5 text-[9px] text-blue-500">{star.siHua}</span>}
                          </span>
                        ))}
                      </div>
                      {palace.daXianAge && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          大限 {palace.daXianAge[0]}-{palace.daXianAge[1]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* 底部 */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>紫微斗数排盘引擎 — 51.8 万命盘数据库驱动</p>
      </footer>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60">{sub}</div>}
    </div>
  );
}

function SimilarCard({ result, rank }: { result: SimilarResult; rank: number }) {
  const { record: r, score, details } = result;
  const gender = r.g === 0 ? '男' : '女';
  const hourNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  // Score color
  let scoreColor = 'text-green-600';
  if (score < 80) scoreColor = 'text-amber-600';
  if (score < 60) scoreColor = 'text-red-500';

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
            {rank}
          </span>
          <div>
            <div className="font-medium">
              {r.y}年{r.m}月{r.d}日 {hourNames[r.h]}时 {gender}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {r.jn} · {BRANCHES[r.sg]}宫命
            </div>
          </div>
        </div>
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {score}<span className="text-sm">%</span>
        </div>
      </div>

      {/* 详细匹配 */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
        <span className={details.mingGongMatch ? 'text-green-600 font-medium' : ''}>
          命宫{details.mingGongMatch ? '✓' : '✗'}
        </span>
        <span className={details.wuxingJuMatch ? 'text-green-600 font-medium' : ''}>
          五行局{details.wuxingJuMatch ? '✓' : '✗'}
        </span>
        <span>
          星曜 {details.starMatch}/{details.starTotal}
        </span>
        <span>
          四化 {details.siHuaMatch}/4
        </span>
      </div>

      {/* 星曜分布 */}
      <div className="flex flex-wrap gap-1">
        {MAJOR_STARS.map((star, i) => {
          const branch = r.sp[i];
          const inSamePlace = details.mingGongMatch; // highlight if star matched
          return (
            <span
              key={star}
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                branch < 12
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                  : 'bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500'
              }`}
            >
              {star}{branch < 12 ? `@${BRANCHES[branch]}` : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
