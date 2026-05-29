'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface PatternStat {
  name: string;
  level: string;
  description: string;
  count: number;
  percentage: number;
}

interface PatternStatsData {
  totalCharts: number;
  processedAt: string;
  processingTimeMs: number;
  patterns: PatternStat[];
  levelCounts: Record<string, number>;
  chartsWithPatterns: number;
  avgPatternsPerChart: number;
  top10: PatternStat[];
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string; emoji: string }> = {
  excellent: { label: '上格', color: '#d4a017', bgColor: '#d4a01722', emoji: '⭐' },
  good: { label: '中吉', color: '#2d8a4e', bgColor: '#2d8a4e22', emoji: '✅' },
  neutral: { label: '中性', color: '#3b82f6', bgColor: '#3b82f622', emoji: '🔵' },
  caution: { label: '凶格', color: '#dc2626', bgColor: '#dc262622', emoji: '⚠️' },
};

export default function PatternsPage() {
  const [data, setData] = useState<PatternStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/pattern-stats.json')
      .then(r => { if (!r.ok) throw new Error('数据加载失败'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const filteredPatterns = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.patterns;
    return data.patterns.filter(p => p.level === filter);
  }, [data, filter]);

  const maxCount = useMemo(() => {
    if (!filteredPatterns.length) return 1;
    return Math.max(...filteredPatterns.map(p => p.count));
  }, [filteredPatterns]);

  const totalLevelCount = useMemo(() => {
    if (!data) return 1;
    return Object.values(data.levelCounts).reduce((a, b) => a + b, 0) || 1;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-amber-400/80">加载格局统计数据中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">⚠️ {error || '数据未找到'}</p>
          <p className="text-white/50 text-sm">请先运行 <code className="bg-white/10 px-2 py-1 rounded">npx tsx scripts/build-pattern-stats.ts</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-amber-400 font-bold text-lg">紫微命盘</Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-white/60 hover:text-white/90 transition-colors">首页</Link>
            <Link href="/chart" className="text-sm text-white/60 hover:text-white/90 transition-colors">排盘</Link>
            <Link href="/heatmap" className="text-sm text-white/60 hover:text-white/90 transition-colors">热力图</Link>
            <Link href="/similar" className="text-sm text-white/60 hover:text-white/90 transition-colors">相似搜索</Link>
            <Link href="/patterns" className="text-sm text-amber-400 font-medium">格局统计</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-20 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">格局统计分析</span>
          </h1>
          <p className="text-white/50 text-lg">
            基于 {data.totalCharts.toLocaleString()} 个命盘样本 · {data.patterns.length} 种格局识别
          </p>
          <p className="text-white/30 text-xs mt-2">
            生成于 {new Date(data.processedAt).toLocaleDateString('zh-CN')} · 耗时 {(data.processingTimeMs / 1000).toFixed(1)}s
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="总命盘数" value={data.totalCharts.toLocaleString()} icon="📊" />
          <StatCard label="含格局命盘" value={data.chartsWithPatterns.toLocaleString()} icon="🔮" />
          <StatCard label="平均格局数" value={data.avgPatternsPerChart.toFixed(1)} icon="📈" />
          <StatCard label="格局种类" value={data.patterns.length.toString()} icon="📋" />
        </div>

        {/* Level Distribution */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-white/90">格局级别分布</h2>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:text-white/80'
              }`}
            >
              全部 ({data.patterns.length})
            </button>
            {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  filter === key
                    ? `text-white border-current`
                    : 'bg-white/5 text-white/50 border-transparent hover:text-white/80'
                }`}
                style={filter === key ? { color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bgColor } : {}}
              >
                {cfg.emoji} {cfg.label} ({data.levelCounts[key] || 0})
              </button>
            ))}
          </div>

          {/* Level bar chart */}
          <div className="space-y-3">
            {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
              const count = data.levelCounts[key] || 0;
              const pct = (count / totalLevelCount * 100);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-white/60 shrink-0">{cfg.emoji} {cfg.label}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: cfg.color }}
                    />
                  </div>
                  <span className="w-24 text-right text-sm text-white/50 shrink-0">
                    {count.toLocaleString()} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* All Patterns Bar Chart */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-white/90">
            格局出现频率
            {filter !== 'all' && <span className="text-sm font-normal text-white/40 ml-2">（筛选: {LEVEL_CONFIG[filter]?.label}）</span>}
          </h2>
          <div className="space-y-2">
            {filteredPatterns.map(p => {
              const cfg = LEVEL_CONFIG[p.level] || LEVEL_CONFIG.neutral;
              const barWidth = (p.count / maxCount * 100);
              const isExpanded = expandedPattern === p.name;
              return (
                <div key={p.name}>
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors"
                    onClick={() => setExpandedPattern(isExpanded ? null : p.name)}
                  >
                    <span className="w-28 text-sm text-white/70 shrink-0 truncate" title={p.name}>{p.name}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(barWidth, 2)}%`, backgroundColor: cfg.color + '99' }}
                      >
                        {barWidth > 8 && <span className="text-[10px] text-white/90 font-medium">{p.percentage}%</span>}
                      </div>
                    </div>
                    <span className="w-20 text-right text-xs text-white/40 shrink-0">
                      {p.count.toLocaleString()}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: cfg.color }}>
                      {cfg.emoji}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="ml-32 mb-2 p-3 bg-white/5 rounded-lg border border-white/10 text-sm text-white/60 leading-relaxed">
                      {p.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 10 Detail Cards */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 text-white/90">TOP 10 高频格局详解</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {data.top10.map((p, i) => {
              const cfg = LEVEL_CONFIG[p.level] || LEVEL_CONFIG.neutral;
              return (
                <div key={p.name} className="bg-white/5 rounded-xl border border-white/10 p-4 hover:border-white/20 transition-all">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl font-bold text-white/20">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white/90">{p.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bgColor }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      </div>
                      <div className="text-sm text-amber-400/80 font-medium mb-1">
                        {p.count.toLocaleString()} 次 · {p.percentage}%
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">{p.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-white/30 text-xs mt-12 pt-8 border-t border-white/5">
          <p>数据来源：51.8万紫微斗数命盘样本 · 格局识别基于《紫微斗数全书》《骨髓赋》体系</p>
          <p className="mt-1">仅供学术研究参考，不构成任何决策建议</p>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-white/90">{value}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  );
}
