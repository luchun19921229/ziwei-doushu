
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FamousPersonCard from '../FamousPersonCard';
import { FAMOUS_PERSONS, FAMOUS_CATEGORIES } from '@/lib/ziwei/famous';
import type { FamousPerson } from '@/lib/ziwei/famous';

interface FamousChartsProps {
  colors: any;
  theme: 'light' | 'dark';
}

export default function FamousCharts({ colors, theme }: FamousChartsProps) {
  const [selectedCategory, setSelectedCategory] = useState<FamousPerson['category'] | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(6);

  const filteredPersons = selectedCategory === 'all'
    ? FAMOUS_PERSONS
    : FAMOUS_PERSONS.filter(p => p.category === selectedCategory);

  const displayedPersons = filteredPersons.slice(0, visibleCount);
  const hasMore = filteredPersons.length > visibleCount;

  const categoryColors: Record<string, string> = {
    '商业': colors.goldSolid || '#d4a843',
    '文艺': '#c084fc',
    '科技': '#60a5fa',
    '体育': '#fb923c',
    '历史': '#facc15',
  };

  return (
    <section className="relative z-10 px-6 md:px-10 lg:px-14 py-20" style={{ background: 'transparent' }}>
      <div className="mx-auto" style={{ maxWidth: '1280px' }}>
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12" style={{ background: colors.goldLine }} />
            <span className="text-[10px] tracking-[0.5em] uppercase" style={{ color: colors.tagText }}>
              Famous Charts
            </span>
            <div className="h-px w-12" style={{ background: colors.goldLine }} />
          </div>
          <h2
            className={`grad-text ${theme === 'dark' ? 'grad-text-dark' : 'grad-text-light'} font-bold mb-4 tracking-tight`}
            style={{ fontSize: 'clamp(28px, 3.5vw, 42px)' }}
          >
            名人命盘 · 经典案例
          </h2>
          <p className="text-sm leading-relaxed max-w-2xl mx-auto" style={{ color: colors.textSecond }}>
            从商业巨擘到文艺大家，14位名人的紫微命盘对照研究
          </p>
        </motion.div>

        {/* 分类筛选 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          <motion.button
            key="all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedCategory('all');
              setVisibleCount(6);
            }}
            className={`px-4 py-2 rounded-full text-[11px] font-medium transition-all ${selectedCategory === 'all' ? 'shadow-lg' : ''}`}
            style={{
              background: selectedCategory === 'all'
                ? colors.goldSolid
                : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
              color: selectedCategory === 'all' ? '#fff' : colors.textMuted,
              border: selectedCategory === 'all'
                ? 'none'
                : `1px solid ${colors.goldLine}`,
            }}
          >
            全部 ({FAMOUS_PERSONS.length})
          </motion.button>
          {FAMOUS_CATEGORIES.map(cat => {
            const count = FAMOUS_PERSONS.filter(p => p.category === cat).length;
            return (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleCount(6);
                }}
                className={`px-4 py-2 rounded-full text-[11px] font-medium transition-all ${selectedCategory === cat ? 'shadow-lg' : ''}`}
                style={{
                  background: selectedCategory === cat
                    ? (categoryColors[cat] || colors.goldSolid)
                    : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                  color: selectedCategory === cat ? '#fff' : colors.textMuted,
                  border: selectedCategory === cat
                    ? 'none'
                    : `1px solid ${colors.goldLine}`,
                }}
              >
                {cat} ({count})
              </motion.button>
            );
          })}
        </motion.div>

        {/* 名人卡片列表 */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {displayedPersons.map((person, index) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <FamousPersonCard person={person} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* 加载更多 */}
        {hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-8"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setVisibleCount(prev => prev + 6)}
              className="px-8 py-3 rounded-full text-sm font-medium transition-all"
              style={{
                background: 'transparent',
                border: `1px solid ${colors.goldLine}`,
                color: colors.goldSolid,
              }}
            >
              加载更多 · {filteredPersons.length - visibleCount} 个案例
            </motion.button>
          </motion.div>
        )}

        {/* 空状态 */}
        {filteredPersons.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🌌</div>
            <p className="text-sm" style={{ color: colors.textMuted }}>
              暂无该分类的名人案例
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}

