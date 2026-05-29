'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface HeatmapData {
  totalCharts: number;
  generatedAt: string;
  stars: string[];
  palaces: string[];
  palaceNames: string[];
  starPalace: Record<string, Record<string, number>>;
  starTotal: Record<string, number>;
  palaceTotal: Record<string, number>;
}

function getColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(30,41,59,0.3)';
  const t = value / max;
  // dark navy → teal → gold gradient
  const h = 220 - t * 30;
  const s = 40 + t * 50;
  const l = 12 + t * 42;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN');
}

export default function HeatmapPage() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ star: string; palace: string; count: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/data/star-heatmap.json')
      .then(r => {
        if (!r.ok) throw new Error('数据文件未找到');
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const globalMax = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    for (const star of data.stars) {
      for (const branch of data.palaces) {
        const v = data.starPalace[star]?.[branch] || 0;
        if (v > max) max = v;
      }
    }
    return max;
  }, [data]);

  const handleMouseEnter = (star: string, palace: string, count: number, e: React.MouseEvent) => {
    setHoverCell({ star, palace, count });
    setTooltipPos({ x: e.clientX + 12, y: e.clientY - 30 });
  };

  const handleMouseLeave = () => setHoverCell(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-amber-400">紫微斗数</Link>
          <div className="flex gap-6 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition">首页</Link>
            <Link href="/chart" className="text-gray-400 hover:text-white transition">排盘</Link>
            <Link href="/heatmap" className="text-amber-400 font-medium">热力图</Link>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-16 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              星曜分布热力图
            </span>
          </h1>
          <p className="text-gray-400">基于命盘样本数据的星曜 × 宫位统计分析</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">正在加载数据...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 text-lg mb-2">⚠️ {error}</p>
            <p className="text-gray-500 text-sm">请先运行 <code className="bg-gray-800 px-2 py-1 rounded">npx tsx scripts/build-star-heatmap.ts</code> 生成数据</p>
          </div>
        )}

        {data && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-xl mx-auto">
              <div className="bg-gray-900 rounded-xl p-4 text-center border border-white/5">
                <div className="text-2xl font-bold text-amber-400">{formatNumber(data.totalCharts)}</div>
                <div className="text-xs text-gray-500 mt-1">总命盘数</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 text-center border border-white/5">
                <div className="text-2xl font-bold text-amber-400">{data.stars.length}</div>
                <div className="text-xs text-gray-500 mt-1">主星数量</div>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 text-center border border-white/5">
                <div className="text-2xl font-bold text-amber-400">{data.palaces.length}</div>
                <div className="text-xs text-gray-500 mt-1">宫位数量</div>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-gray-900/50 p-4">
              <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th className="text-left text-xs text-gray-500 font-medium p-2 w-20">星曜</th>
                    {data.palaces.map((branch, i) => (
                      <th key={branch} className="text-center p-2">
                        <div className="text-xs font-medium text-gray-300">{branch}</div>
                        <div className="text-[10px] text-gray-600">{data.palaceNames[i]}</div>
                      </th>
                    ))}
                    <th className="text-center text-xs text-gray-500 font-medium p-2 w-20">合计</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stars.map(star => (
                    <tr key={star}>
                      <td className="text-sm font-medium text-gray-300 p-1.5 whitespace-nowrap">
                        {star}
                      </td>
                      {data.palaces.map(branch => {
                        const count = data.starPalace[star]?.[branch] || 0;
                        const pct = data.totalCharts > 0 ? (count / data.totalCharts * 100) : 0;
                        return (
                          <td
                            key={branch}
                            className="text-center p-1 cursor-default transition-transform hover:scale-110 hover:z-10 relative"
                            style={{ backgroundColor: getColor(count, globalMax) }}
                            onMouseEnter={(e) => handleMouseEnter(star, branch, count, e)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <span className={`text-[11px] font-mono ${count > globalMax * 0.4 ? 'text-white' : 'text-gray-400'}`}>
                              {count > 0 ? (pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)) : ''}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-center text-xs text-gray-500 font-mono p-1.5">
                        {formatNumber(data.starTotal[star] || 0)}
                      </td>
                    </tr>
                  ))}
                  {/* Palace totals row */}
                  <tr className="border-t border-white/10">
                    <td className="text-xs text-gray-500 font-medium p-1.5">合计</td>
                    {data.palaces.map(branch => (
                      <td key={branch} className="text-center text-xs text-gray-500 font-mono p-1.5">
                        {formatNumber(data.palaceTotal[branch] || 0)}
                      </td>
                    ))}
                    <td className="text-center text-xs text-gray-600 p-1.5">
                      {formatNumber(data.totalCharts * 14)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Color Legend */}
            <div className="flex items-center justify-center gap-3 mt-6 text-xs text-gray-500">
              <span>少</span>
              <div className="flex h-4 rounded overflow-hidden">
                {Array.from({ length: 20 }, (_, i) => {
                  const t = i / 19;
                  return (
                    <div
                      key={i}
                      className="w-5 h-full"
                      style={{ backgroundColor: getColor(t * globalMax, globalMax) }}
                    />
                  );
                })}
              </div>
              <span>多</span>
            </div>

            {/* Insight: Top star-palace combinations */}
            <div className="mt-10">
              <h2 className="text-lg font-bold text-gray-200 mb-4">📊 高频星曜组合 TOP 10</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(() => {
                  const combos: { star: string; palace: string; count: number; branchIdx: number }[] = [];
                  data.stars.forEach(star => {
                    data.palaces.forEach((branch, bi) => {
                      const count = data.starPalace[star]?.[branch] || 0;
                      if (count > 0) combos.push({ star, palace: branch, count, branchIdx: bi });
                    });
                  });
                  combos.sort((a, b) => b.count - a.count);
                  return combos.slice(0, 10).map((c, i) => (
                    <div key={i} className="bg-gray-900 border border-white/5 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">#{i + 1}</div>
                      <div className="text-sm font-medium text-amber-400">
                        {c.star} × {c.palace}宫
                      </div>
                      <div className="text-lg font-bold text-white">{formatNumber(c.count)}</div>
                      <div className="text-[10px] text-gray-600">
                        {(c.count / data.totalCharts * 100).toFixed(1)}% 命盘
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Footer info */}
            <div className="mt-10 text-center text-xs text-gray-600">
              数据生成时间: {new Date(data.generatedAt).toLocaleString('zh-CN')}
            </div>
          </>
        )}
      </main>

      {/* Tooltip */}
      {hoverCell && (
        <div
          className="fixed z-50 pointer-events-none bg-gray-800 border border-white/20 rounded-lg px-3 py-2 shadow-xl text-sm"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="font-medium text-amber-400">{hoverCell.star} × {hoverCell.palace}宫</div>
          <div className="text-white">
            {formatNumber(hoverCell.count)} 次
            <span className="text-gray-400 ml-2">
              ({data ? (hoverCell.count / data.totalCharts * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-gray-600">
        <p>紫微斗数排盘引擎 · 数据仅供参考</p>
      </footer>
    </div>
  );
}
