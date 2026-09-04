import React, { useState } from 'react';

/**
 * Helper to clean markdown formatting characters (*, _, `, #) from a string
 */
function cleanText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

/**
 * Format status values with theme-consistent color badges
 */
function getStatusBadgeStyle(status) {
  const s = String(status || '').toLowerCase().trim().replace(/[\s_-]+/g, '_');
  switch (s) {
    case 'matched':
    case 'success':
      return { label: 'Matched', badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80' };
    case 'amount_mismatch':
    case 'mismatch':
      return { label: 'Amount Mismatch', badge: 'bg-amber-950/60 text-amber-400 border-amber-800/80' };
    case 'missing_settlement':
      return { label: 'Missing Settlement', badge: 'bg-rose-950/60 text-rose-400 border-rose-800/80' };
    case 'settlement_delay':
    case 'delay':
    case 'delayed':
      return { label: 'Settlement Delay', badge: 'bg-orange-950/60 text-orange-400 border-orange-800/80' };
    case 'unknown_credit':
      return { label: 'Unknown Credit', badge: 'bg-purple-950/60 text-purple-400 border-purple-800/80' };
    case 'duplicate':
      return { label: 'Duplicate', badge: 'bg-pink-950/60 text-pink-400 border-pink-800/80' };
    case 'likely_match':
      return { label: 'Likely Match', badge: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/80' };
    case 'failed':
      return { label: 'Failed', badge: 'bg-rose-950/60 text-rose-400 border-rose-800/80' };
    default:
      return null;
  }
}

/**
 * Format priority values with theme-consistent badges and pulsing dots
 */
function getPriorityBadgeStyle(priority) {
  const p = String(priority || '').toLowerCase().trim();
  switch (p) {
    case 'critical':
      return {
        label: 'CRITICAL',
        container: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-400 shadow-sm shadow-rose-400',
      };
    case 'high':
      return {
        label: 'HIGH',
        container: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        dot: 'bg-orange-400 shadow-sm shadow-orange-400',
      };
    case 'medium':
      return {
        label: 'MEDIUM',
        container: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400 shadow-sm shadow-amber-400',
      };
    case 'low':
      return {
        label: 'LOW',
        container: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400 shadow-sm shadow-emerald-400',
      };
    default:
      return null;
  }
}

/**
 * Render inline markdown (bold, italic, inline code)
 */
function renderInlineMarkdown(text) {
  if (!text) return null;
  const parts = [];
  // Regex matches: **bold**, `code`, *italic*
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const tokens = String(text).split(regex);

  return tokens.map((token, idx) => {
    if (!token) return null;
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={idx}
          className="bg-slate-800 text-cyan-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-700 mx-0.5"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return (
        <em key={idx} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

/**
 * Smart Cell Renderer: identifies IDs, statuses, priorities, currencies, or plain markdown
 */
function SmartTableCell({ cell, isHeader, alignment }) {
  const clean = cleanText(cell);
  const alignClass =
    alignment === 'right'
      ? 'text-right'
      : alignment === 'center'
      ? 'text-center'
      : 'text-left';

  if (isHeader) {
    return (
      <th
        className={`py-3 px-3.5 text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-400 whitespace-nowrap bg-slate-950/80 border-b border-slate-700/80 select-none ${alignClass}`}
      >
        {renderInlineMarkdown(cell)}
      </th>
    );
  }

  // 1. Check if status badge
  const statusBadge = getStatusBadgeStyle(clean);
  if (statusBadge) {
    return (
      <td className={`py-2.5 px-3.5 whitespace-nowrap ${alignClass}`}>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${statusBadge.badge}`}
        >
          {statusBadge.label}
        </span>
      </td>
    );
  }

  // 2. Check if priority badge
  const priorityBadge = getPriorityBadgeStyle(clean);
  if (priorityBadge) {
    return (
      <td className={`py-2.5 px-3.5 whitespace-nowrap ${alignClass}`}>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${priorityBadge.container}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${priorityBadge.dot}`} />
          {priorityBadge.label}
        </span>
      </td>
    );
  }

  // 3. Check if Reference ID (e.g. TXN..., ORD..., PAY...)
  const isRefId = /^(?:txn|ord|pay|ref)[-_]?[a-z0-9]+$/i.test(clean);
  if (isRefId) {
    return (
      <td className={`py-2.5 px-3.5 whitespace-nowrap ${alignClass}`}>
        <span className="font-mono font-bold text-cyan-300 text-xs bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50 shadow-inner">
          {clean}
        </span>
      </td>
    );
  }

  // 4. Check if currency amount (₹... or number)
  const isCurrency = /(?:₹|rs\.?|inr|\$)\s*[\d,]+(?:\.\d+)?/i.test(cell) || /^[\d,]+(?:\.\d+)?$/.test(clean);
  if (isCurrency) {
    return (
      <td className={`py-2.5 px-3.5 whitespace-nowrap font-mono font-bold text-white text-xs ${alignClass}`}>
        {renderInlineMarkdown(cell)}
      </td>
    );
  }

  // Default cell rendering with inline markdown support
  return (
    <td className={`py-2.5 px-3.5 text-xs text-slate-200 leading-relaxed ${alignClass}`}>
      {renderInlineMarkdown(cell)}
    </td>
  );
}

/**
 * Premium Table Component with interactive animations, column sorting, copy to clipboard, and CSV export
 */
function FormattedTable({ headers, alignments, rows }) {
  const [copied, setCopied] = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Toggle sorting on column click
  const handleSort = (colIdx) => {
    if (sortCol === colIdx) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
  };

  // Sort rows if column selected
  const displayRows = React.useMemo(() => {
    if (sortCol === null) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const valA = cleanText(a[sortCol] || '').toLowerCase();
      const valB = cleanText(b[sortCol] || '').toLowerCase();

      // Try numeric comparison first
      const numA = parseFloat(valA.replace(/[₹$,]/g, ''));
      const numB = parseFloat(valB.replace(/[₹$,]/g, ''));
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }

      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    return sorted;
  }, [rows, sortCol, sortAsc]);

  // Copy table formatted as TSV for Excel / Sheets
  const handleCopyTSV = () => {
    try {
      const cleanH = headers.map(cleanText);
      const cleanR = displayRows.map((r) => r.map(cleanText));
      const tsvContent = [cleanH.join('\t'), ...cleanR.map((r) => r.join('\t'))].join('\n');
      navigator.clipboard.writeText(tsvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy table:', err);
    }
  };

  // Download table as CSV
  const handleDownloadCSV = () => {
    try {
      const escapeCsvCell = (val) => {
        const str = cleanText(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.map(escapeCsvCell).join(','),
        ...displayRows.map((row) => row.map(escapeCsvCell).join(',')),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `finrecon_table_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-slate-700/80 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:border-cyan-500/40 hover:shadow-cyan-950/20 hover:shadow-2xl animate-fade-in-scale">
      {/* Animated Top Gradient Accent Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 animate-gradient-pan opacity-90" />

      {/* Table Toolbar Header */}
      <div className="px-3.5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider">
            <span className="animate-pulse">📊</span>
            <span>Ledger Table</span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 shadow-inner">
            {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </span>
          {sortCol !== null && (
            <span className="text-[10px] text-cyan-400/80 font-mono hidden sm:inline-flex items-center gap-1">
              <span>Sorted by {cleanText(headers[sortCol])}</span>
              <span>{sortAsc ? '▲' : '▼'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyTSV}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 hover:scale-105 active:scale-95 ${
              copied
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600 shadow-md shadow-emerald-950/50'
                : 'bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 border border-slate-700'
            }`}
            title="Copy as Tab-Separated Values for pasting into Excel or Google Sheets"
          >
            {copied ? (
              <>
                <span className="text-emerald-400 font-bold animate-bounce">✓</span>
                <span className="text-emerald-300 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Copy (Excel)</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 hover:text-white border border-cyan-800/60 transition-all duration-150 hover:scale-105 active:scale-95 shadow-sm"
            title="Download table data as CSV file"
          >
            <span>📥</span>
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Body with Horizontal Scroll */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              {headers.map((h, idx) => {
                const isSorted = sortCol === idx;
                const alignClass =
                  alignments[idx] === 'right'
                    ? 'text-right'
                    : alignments[idx] === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(idx)}
                    className={`py-3 px-3.5 text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-400 whitespace-nowrap bg-slate-950/80 border-b border-slate-700/80 select-none cursor-pointer hover:bg-slate-850 hover:text-white transition-colors duration-150 group/th ${alignClass}`}
                    title="Click to sort column"
                  >
                    <div className={`inline-flex items-center gap-1.5 ${alignments[idx] === 'right' ? 'justify-end' : alignments[idx] === 'center' ? 'justify-center' : 'justify-start'}`}>
                      <span>{renderInlineMarkdown(h)}</span>
                      <span className={`text-[9px] transition-all duration-150 ${isSorted ? 'text-cyan-300 font-black' : 'text-slate-600 opacity-0 group-hover/th:opacity-100'}`}>
                        {isSorted ? (sortAsc ? '▲' : '▼') : '↕'}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {displayRows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-slate-800/60 hover:translate-x-0.5 transition-all duration-150 group border-b border-slate-800/60 last:border-0"
              >
                {row.map((cell, cIdx) => (
                  <SmartTableCell
                    key={cIdx}
                    cell={cell}
                    isHeader={false}
                    alignment={alignments[cIdx] || 'left'}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Render Markdown Text Blocks: Headings, Bullet Lists, and Paragraphs
 */
function FormattedTextBlock({ content }) {
  if (!content || !content.trim()) return null;

  const lines = content.split(/\r?\n/);
  const elements = [];
  let currentList = [];
  let listType = null; // 'ul' or 'ol'

  const flushList = (keyPrefix) => {
    if (currentList.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`${keyPrefix}-ol`} className="list-decimal list-inside space-y-1 my-2 text-slate-200 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineMarkdown(item)}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`${keyPrefix}-ul`} className="space-y-1.5 my-2 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed text-slate-200">
                <span className="text-cyan-400 select-none mt-1 text-xs">•</span>
                <span>{renderInlineMarkdown(item)}</span>
              </li>
            ))}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check headings
    if (trimmed.startsWith('### ')) {
      flushList(idx);
      elements.push(
        <h4 key={idx} className="text-xs sm:text-sm font-bold text-cyan-300 uppercase tracking-wider mt-3 mb-1.5 font-mono">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="text-sm sm:text-base font-black text-white tracking-tight mt-3 mb-2">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList(idx);
      elements.push(
        <h2 key={idx} className="text-base sm:text-lg font-black text-white tracking-tight mt-3 mb-2">
          {renderInlineMarkdown(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Check bullet list item (- item, * item, • item)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (listType === 'ol') flushList(idx);
      listType = 'ul';
      currentList.push(bulletMatch[1]);
      return;
    }

    // Check numbered list item (1. item)
    const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numMatch) {
      if (listType === 'ul') flushList(idx);
      listType = 'ol';
      currentList.push(numMatch[1]);
      return;
    }

    // Normal line
    flushList(idx);
    if (trimmed) {
      elements.push(
        <p key={idx} className="my-1.5 leading-relaxed text-slate-200">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  flushList('end');
  return <div className="space-y-1">{elements}</div>;
}

/**
 * Fenced Code Block Renderer
 */
function FormattedCodeBlock({ language, content }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-lg">
      <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono">
        <span className="text-slate-400">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-cyan-300 overflow-x-auto">
        <code>{content}</code>
      </pre>
    </div>
  );
}

/**
 * Parser functions for Markdown & ASCII tables
 */
function isTableSeparatorLine(line) {
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  const cleaned = trimmed.replace(/^\|/, '').replace(/\|$/, '').trim();
  const parts = cleaned.split('|').map((p) => p.trim());
  if (parts.length === 0) return false;
  return parts.every((part) => /^:?-+:?$/.test(part));
}

function parseTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

function parseTableAlignments(separatorLine, colCount) {
  const cells = parseTableRow(separatorLine);
  return Array.from({ length: colCount }, (_, idx) => {
    const c = cells[idx] || '';
    const leftColon = c.startsWith(':');
    const rightColon = c.endsWith(':');
    if (leftColon && rightColon) return 'center';
    if (rightColon) return 'right';
    return 'left';
  });
}

function parseAsciiTable(tableLines) {
  const contentLines = tableLines.filter((l) => /^\s*\|.*\|\s*$/.test(l));
  if (contentLines.length < 2) return null;
  const headers = parseTableRow(contentLines[0]);
  const rows = contentLines.slice(1).map((l) => {
    const row = parseTableRow(l);
    while (row.length < headers.length) row.push('');
    return row.slice(0, headers.length);
  });
  return {
    headers,
    alignments: Array(headers.length).fill('left'),
    rows,
  };
}

/**
 * Main parser that segments raw content into text, table, and code blocks
 */
function parseBlocks(content) {
  if (!content || typeof content !== 'string') return [];

  const lines = content.split(/\r?\n/);
  const blocks = [];
  let currentTextBlock = [];
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 1. Fenced code block check
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code', language: codeLang, content: codeLines.join('\n') });
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        if (currentTextBlock.length > 0) {
          blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
          currentTextBlock = [];
        }
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // 2. ASCII box table check (+---+ or +===+)
    if (/^\s*\+[-+=| ]+\+\s*$/.test(line)) {
      let j = i;
      const tableLines = [];
      while (
        j < lines.length &&
        (/^\s*\+[-+=| ]+\+\s*$/.test(lines[j]) || /^\s*\|.*\|\s*$/.test(lines[j]))
      ) {
        tableLines.push(lines[j]);
        j++;
      }
      if (tableLines.length >= 3) {
        const asciiTable = parseAsciiTable(tableLines);
        if (asciiTable && asciiTable.headers.length > 0 && asciiTable.rows.length > 0) {
          if (currentTextBlock.length > 0) {
            blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
            currentTextBlock = [];
          }
          blocks.push({ type: 'table', ...asciiTable });
          i = j;
          continue;
        }
      }
    }

    // 3. Markdown table check (| Header 1 | Header 2 | ...)
    if (line.includes('|')) {
      const nextLine = lines[i + 1];
      if (nextLine && isTableSeparatorLine(nextLine)) {
        if (currentTextBlock.length > 0) {
          blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
          currentTextBlock = [];
        }

        const headers = parseTableRow(line);
        const alignments = parseTableAlignments(nextLine, headers.length);
        const rows = [];

        i += 2; // skip header and separator
        while (i < lines.length) {
          const rowLine = lines[i];
          if (!rowLine.trim() || !rowLine.includes('|')) {
            break;
          }
          if (isTableSeparatorLine(rowLine)) {
            i++;
            continue;
          }
          const rowCells = parseTableRow(rowLine);
          while (rowCells.length < headers.length) rowCells.push('');
          rows.push(rowCells.slice(0, headers.length));
          i++;
        }

        blocks.push({
          type: 'table',
          headers,
          alignments,
          rows,
        });
        continue;
      }
    }

    currentTextBlock.push(line);
    i++;
  }

  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({ type: 'code', language: codeLang, content: codeLines.join('\n') });
  }

  if (currentTextBlock.length > 0) {
    blocks.push({ type: 'text', content: currentTextBlock.join('\n') });
  }

  return blocks;
}

/**
 * Top-Level Chat Markdown and Table Renderer Component
 */
export default function ChatMarkdownRenderer({ content, isUser = false }) {
  if (!content) return null;

  // For user messages, simple text display with inline formatting
  if (isUser) {
    return <div className="whitespace-pre-wrap font-medium">{renderInlineMarkdown(content)}</div>;
  }

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2 text-xs sm:text-sm font-normal">
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          return (
            <FormattedTable
              key={idx}
              headers={block.headers}
              alignments={block.alignments}
              rows={block.rows}
            />
          );
        }
        if (block.type === 'code') {
          return (
            <FormattedCodeBlock
              key={idx}
              language={block.language}
              content={block.content}
            />
          );
        }
        return <FormattedTextBlock key={idx} content={block.content} />;
      })}
    </div>
  );
}
