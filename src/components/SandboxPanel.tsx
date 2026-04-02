import { useState, useMemo } from 'react'
import type { StructuredContext, ChatMessage } from '../hooks/use-chat'

interface SandboxPanelProps {
  context: StructuredContext | null
  messages: ChatMessage[]
  status: string
}

type Tab = 'sandbox' | 'ops'

function generateContextHtml(ctx: StructuredContext): string {
  const escHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  // Compute quality score from strengths vs concerns
  const totalQ = ctx.quality.strengths.length + ctx.quality.concerns.length
  const qualityScore = totalQ > 0 ? Math.round((ctx.quality.strengths.length / totalQ) * 100) : 50
  const qualityColor = qualityScore >= 70 ? '#fff' : qualityScore >= 40 ? '#fff3cd' : '#ffcdd2'

  // Stack chips for home view
  const stackChips = ctx.stack.map((s) =>
    `<div class="stack-chip"><span class="stack-name">${escHtml(s.name)}</span><span class="stack-role">${escHtml(s.role)}</span></div>`
  ).join('')

  // Feature cards
  const featureCards = ctx.features.map((f, i) => {
    const cxColor = f.complexity === 'high' ? '#ff5f57' : f.complexity === 'medium' ? '#febc2e' : '#28c840'
    const cxBg = f.complexity === 'high' ? 'rgba(255,95,87,0.08)' : f.complexity === 'medium' ? 'rgba(254,188,46,0.08)' : 'rgba(40,200,64,0.08)'
    const filesHtml = f.relatedFiles.length > 0
      ? f.relatedFiles.map(rf => `<div class="file-ref">${escHtml(rf)}</div>`).join('')
      : '<div class="file-ref dim">no files mapped</div>'
    return `<div class="feature-card" onclick="toggleFeature(${i})">
      <div class="feature-header">
        <div class="feature-title">${escHtml(f.name)}</div>
        <div class="complexity-badge" style="background:${cxBg};color:${cxColor};border-color:${cxColor}30">${f.complexity}</div>
      </div>
      <div class="feature-desc">${escHtml(f.description)}</div>
      <div class="feature-expand" id="feat-${i}">
        <div class="expand-section">
          <div class="expand-label">Related Files</div>
          ${filesHtml}
        </div>
      </div>
      <div class="feature-chevron" id="chev-${i}">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>
    </div>`
  }).join('')

  // Architecture layers
  const layerNodes = ctx.architecture.layers.map((l, i) => {
    const hue = 20 + i * 15
    return `<div class="arch-layer" style="--layer-hue:${hue}">
      <div class="layer-index">${String(i + 1).padStart(2, '0')}</div>
      <div class="layer-name">${escHtml(l)}</div>
    </div>`
  }).join('<div class="layer-connector"><svg width="2" height="16" viewBox="0 0 2 16"><line x1="1" y1="0" x2="1" y2="16" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-dasharray="3 3"/></svg></div>')

  // Decisions for architecture view
  const decisionCards = ctx.decisions.map((d) =>
    `<div class="decision-card">
      <div class="decision-title">${escHtml(d.title)}</div>
      <div class="decision-rationale">${escHtml(d.rationale)}</div>
      ${d.tradeoff ? `<div class="decision-tradeoff">${escHtml(d.tradeoff)}</div>` : ''}
    </div>`
  ).join('')

  // Quality items
  const strengthItems = ctx.quality.strengths.map(s =>
    `<div class="quality-item quality-good"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#28c840" stroke-width="1.2"/><path d="M4.5 7L6.5 9L9.5 5.5" stroke="#28c840" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${escHtml(s)}</span></div>`
  ).join('')
  const concernItems = ctx.quality.concerns.map(c =>
    `<div class="quality-item quality-bad"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#ff5f57" stroke-width="1.2"/><path d="M5 5L9 9M9 5L5 9" stroke="#ff5f57" stroke-width="1.2" stroke-linecap="round"/></svg><span>${escHtml(c)}</span></div>`
  ).join('')

  return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.25);border-radius:3px}
body{
  background:#f6821f;color:#1a1a2e;font-family:'Inter',system-ui,-apple-system,sans-serif;
  font-size:12px;height:100vh;display:flex;flex-direction:column;overflow:hidden;
  -webkit-font-smoothing:antialiased;
}

/* ---- App Header ---- */
.app-header{
  padding:12px 16px 8px;display:flex;align-items:center;gap:10px;
  background:rgba(0,0,0,0.15);flex-shrink:0;
  border-bottom:1px solid rgba(255,255,255,0.1);position:relative;z-index:10;
}
.app-icon{
  width:28px;height:28px;border-radius:8px;
  background:rgba(255,255,255,0.2);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  box-shadow:0 2px 8px rgba(0,0,0,0.15);
}
.app-icon svg{width:16px;height:16px}
.app-title-group{flex:1;min-width:0}
.app-name{font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.app-subtitle{font-size:10px;color:rgba(255,255,255,0.6);margin-top:1px}

/* ---- Views Container ---- */
.views{flex:1;overflow:hidden;position:relative}
.view{
  position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;
  padding:16px 14px 80px;color:#1a0a00;
  opacity:0;transform:translateX(20px);pointer-events:none;
  transition:opacity 0.28s ease,transform 0.28s ease;
}
.view.active{opacity:1;transform:translateX(0);pointer-events:auto}
.view.exit-left{opacity:0;transform:translateX(-20px);pointer-events:none}

/* ---- Home View ---- */
.hero-card{
  background:rgba(255,255,255,0.15);
  border:1px solid rgba(255,255,255,0.2);border-radius:16px;padding:20px 18px;margin-bottom:14px;
  position:relative;overflow:hidden;backdrop-filter:blur(8px);
}
.hero-card::before{
  content:'';position:absolute;top:-40%;right:-30%;width:70%;height:70%;
  background:radial-gradient(circle,rgba(255,255,255,0.08),transparent 70%);pointer-events:none;
}
.hero-name{font-size:18px;font-weight:700;color:#fff;margin-bottom:6px;letter-spacing:-0.3px}
.hero-summary{font-size:11px;color:rgba(255,255,255,0.75);line-height:1.55;margin-bottom:14px}
.hero-badges{display:flex;gap:8px;flex-wrap:wrap}
.hero-badge{
  display:flex;align-items:center;gap:5px;
  background:rgba(0,0,0,0.15);border:1px solid rgba(0,0,0,0.1);
  border-radius:8px;padding:5px 10px;font-size:10px;color:#fff;font-weight:500;
}
.hero-badge svg{width:12px;height:12px;flex-shrink:0}

.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
.stat-card{
  background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:12px;text-align:center;
  transition:border-color 0.2s,transform 0.15s;backdrop-filter:blur(4px);
}
.stat-card:active{transform:scale(0.97)}
.stat-value{font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px}
.stat-label{font-size:9px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.8px;margin-top:3px}

.section-title{
  font-size:10px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.2px;
  margin:16px 0 10px;padding-left:2px;
}

.stack-grid{display:flex;flex-wrap:wrap;gap:6px}
.stack-chip{
  background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px 11px;
  display:flex;flex-direction:column;gap:1px;transition:border-color 0.2s,background 0.2s;
}
.stack-chip:active{background:rgba(255,255,255,0.2);border-color:rgba(255,255,255,0.3)}
.stack-name{font-size:11px;font-weight:500;color:#fff}
.stack-role{font-size:9px;color:rgba(255,255,255,0.5)}

/* ---- Features View ---- */
.feature-card{
  background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:14px 14px 10px;
  margin-bottom:8px;position:relative;cursor:pointer;
  transition:border-color 0.2s,background 0.2s,transform 0.15s;backdrop-filter:blur(4px);
}
.feature-card:active{transform:scale(0.985);background:rgba(255,255,255,0.22)}
.feature-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.feature-title{font-size:12px;font-weight:600;color:#fff;flex:1;min-width:0}
.complexity-badge{
  font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;
  padding:3px 8px;border-radius:6px;border:1px solid;flex-shrink:0;
}
.feature-desc{font-size:10px;color:rgba(255,255,255,0.65);line-height:1.5}
.feature-expand{
  max-height:0;overflow:hidden;transition:max-height 0.3s ease;
}
.feature-expand.open{max-height:300px}
.expand-section{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.15)}
.expand-label{font-size:9px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px}
.file-ref{
  font-size:10px;color:#fff;font-family:'JetBrains Mono',monospace;
  padding:3px 0;opacity:0.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.file-ref.dim{color:rgba(255,255,255,0.4)}
.feature-chevron{
  display:flex;justify-content:center;padding-top:4px;color:rgba(255,255,255,0.4);
  transition:transform 0.25s ease,color 0.2s;
}
.feature-chevron.open{transform:rotate(180deg);color:#fff}

/* ---- Architecture View ---- */
.arch-pattern-card{
  background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);
  border-radius:14px;padding:16px;margin-bottom:14px;backdrop-filter:blur(4px);
}
.arch-pattern-name{font-size:14px;font-weight:700;color:#fff;margin-bottom:6px}
.arch-pattern-desc{font-size:10px;color:rgba(255,255,255,0.7);line-height:1.5}
.arch-flow{
  background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:14px;margin-bottom:14px;
}
.arch-flow-label{font-size:9px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px}
.arch-flow-text{font-size:10px;color:rgba(255,255,255,0.75);line-height:1.6}
.arch-layers{display:flex;flex-direction:column;align-items:center;gap:0;margin:12px 0}
.arch-layer{
  width:100%;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);
  border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;
  transition:border-color 0.2s,transform 0.15s;
}
.arch-layer:active{transform:scale(0.98)}
.layer-index{
  font-size:9px;font-weight:700;color:#fff;
  background:rgba(0,0,0,0.15);
  width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;
}
.layer-name{font-size:11px;font-weight:500;color:#fff}
.layer-connector{display:flex;justify-content:center;padding:2px 0}

.decision-card{
  background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:12px 14px;margin-bottom:8px;
  border-left:3px solid rgba(255,255,255,0.3);
}
.decision-title{font-size:11px;font-weight:600;color:#fff;margin-bottom:4px}
.decision-rationale{font-size:10px;color:rgba(255,255,255,0.7);line-height:1.5}
.decision-tradeoff{font-size:9px;color:#fff;margin-top:6px;opacity:0.7;font-style:italic}

/* ---- Quality View ---- */
.gauge-container{
  display:flex;flex-direction:column;align-items:center;padding:20px 0 16px;
}
.gauge-ring{
  width:120px;height:120px;position:relative;margin-bottom:12px;
}
.gauge-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.gauge-ring circle{fill:none;stroke-width:6}
.gauge-bg{stroke:rgba(255,255,255,0.15)}
.gauge-fill{stroke-linecap:round;transition:stroke-dashoffset 1s ease}
.gauge-value{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
}
.gauge-number{font-size:28px;font-weight:700;color:#fff;letter-spacing:-1px}
.gauge-label{font-size:9px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-top:2px}
.gauge-summary{font-size:10px;color:rgba(255,255,255,0.7);text-align:center;line-height:1.5;max-width:260px;margin:0 auto}

.quality-section{margin-top:16px}
.quality-section-title{
  font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;padding-left:2px;
}
.quality-section-title.good-title{color:#fff}
.quality-section-title.bad-title{color:rgba(255,255,255,0.8)}
.quality-item{
  display:flex;align-items:flex-start;gap:8px;padding:8px 12px;
  background:rgba(255,255,255,0.1);border-radius:10px;margin-bottom:5px;
}
.quality-item span{font-size:10px;line-height:1.5;flex:1}
.quality-good span{color:#fff}
.quality-bad span{color:rgba(255,255,255,0.85)}
.quality-item svg{flex-shrink:0;margin-top:1px}

/* ---- Bottom Tab Bar ---- */
.tab-bar{
  position:fixed;bottom:0;left:0;right:0;
  display:flex;background:rgba(200,90,0,0.85);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border-top:1px solid rgba(255,255,255,0.15);padding:6px 0 env(safe-area-inset-bottom,6px);
  z-index:100;
}
.tab-item{
  flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:6px 0;cursor:pointer;transition:color 0.2s;color:rgba(255,255,255,0.45);
  border:none;background:none;font-family:inherit;-webkit-tap-highlight-color:transparent;
}
.tab-item:active{opacity:0.7}
.tab-item.active{color:#fff}
.tab-item svg{width:20px;height:20px}
.tab-label{font-size:9px;font-weight:500;letter-spacing:0.3px}
.tab-indicator{
  position:absolute;top:-1px;height:2px;background:#fff;border-radius:0 0 2px 2px;
  transition:left 0.3s ease,width 0.3s ease;
}

</style></head><body>

<!-- App Header -->
<div class="app-header">
  <div class="app-icon">
    <svg viewBox="0 0 16 16" fill="none"><path d="M4 12L8 4L12 12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9.5H10.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
  </div>
  <div class="app-title-group">
    <div class="app-name">${escHtml(ctx.project.name)}</div>
    <div class="app-subtitle">Code Analysis</div>
  </div>
</div>

<!-- Views -->
<div class="views">

  <!-- HOME VIEW -->
  <div class="view active" id="view-home">
    <div class="hero-card">
      <div class="hero-name">${escHtml(ctx.project.name)}</div>
      <div class="hero-summary">${escHtml(ctx.project.summary)}</div>
      <div class="hero-badges">
        <div class="hero-badge">
          <svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.2"/><path d="M6 4V6.5H8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          ${escHtml(ctx.project.primaryLanguage)}
        </div>
        ${ctx.project.stars ? `<div class="hero-badge"><svg viewBox="0 0 12 12" fill="none"><path d="M6 1.5L7.4 4.3L10.5 4.8L8.25 7L8.8 10.1L6 8.6L3.2 10.1L3.75 7L1.5 4.8L4.6 4.3L6 1.5Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>${ctx.project.stars}</div>` : ''}
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">${ctx.features.length}</div>
        <div class="stat-label">Features</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${ctx.stack.length}</div>
        <div class="stat-label">Stack</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${qualityColor}">${qualityScore}<span style="font-size:12px;color:#6b6b8a">%</span></div>
        <div class="stat-label">Quality</div>
      </div>
    </div>

    ${ctx.stack.length > 0 ? `<div class="section-title">Tech Stack</div><div class="stack-grid">${stackChips}</div>` : ''}
  </div>

  <!-- FEATURES VIEW -->
  <div class="view" id="view-features">
    <div class="section-title">Features (${ctx.features.length})</div>
    ${featureCards || '<div style="color:#4a4a60;font-size:11px;padding:20px;text-align:center">No features discovered</div>'}
  </div>

  <!-- ARCHITECTURE VIEW -->
  <div class="view" id="view-arch">
    <div class="arch-pattern-card">
      <div class="arch-pattern-name">${escHtml(ctx.architecture.pattern || 'Unknown Pattern')}</div>
      <div class="arch-pattern-desc">${escHtml(ctx.architecture.description)}</div>
    </div>

    ${ctx.architecture.layers.length > 0 ? `
    <div class="section-title">Layers</div>
    <div class="arch-layers">${layerNodes}</div>
    ` : ''}

    ${ctx.architecture.dataFlow ? `
    <div class="arch-flow">
      <div class="arch-flow-label">Data Flow</div>
      <div class="arch-flow-text">${escHtml(ctx.architecture.dataFlow)}</div>
    </div>
    ` : ''}

    ${ctx.decisions.length > 0 ? `
    <div class="section-title">Key Decisions</div>
    ${decisionCards}
    ` : ''}
  </div>

  <!-- QUALITY VIEW -->
  <div class="view" id="view-quality">
    <div class="gauge-container">
      <div class="gauge-ring">
        <svg viewBox="0 0 120 120">
          <circle class="gauge-bg" cx="60" cy="60" r="52"/>
          <circle class="gauge-fill" cx="60" cy="60" r="52"
            stroke="${qualityColor}"
            stroke-dasharray="${2 * Math.PI * 52}"
            stroke-dashoffset="${2 * Math.PI * 52 * (1 - qualityScore / 100)}"
          />
        </svg>
        <div class="gauge-value">
          <div class="gauge-number" style="color:${qualityColor}">${qualityScore}</div>
          <div class="gauge-label">Score</div>
        </div>
      </div>
      ${ctx.quality.overall ? `<div class="gauge-summary">${escHtml(ctx.quality.overall)}</div>` : ''}
    </div>

    ${ctx.quality.strengths.length > 0 ? `
    <div class="quality-section">
      <div class="quality-section-title good-title">Strengths (${ctx.quality.strengths.length})</div>
      ${strengthItems}
    </div>
    ` : ''}

    ${ctx.quality.concerns.length > 0 ? `
    <div class="quality-section">
      <div class="quality-section-title bad-title">Concerns (${ctx.quality.concerns.length})</div>
      ${concernItems}
    </div>
    ` : ''}
  </div>

</div>

<!-- Bottom Tab Bar -->
<div class="tab-bar" id="tabBar">
  <button class="tab-item active" onclick="switchView('home')" data-tab="home">
    <svg viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3L17 8.5V16C17 16.6 16.6 17 16 17H4C3.4 17 3 16.6 3 16V8.5Z" stroke="currentColor" stroke-width="1.3"/><path d="M8 17V11H12V17" stroke="currentColor" stroke-width="1.3"/></svg>
    <span class="tab-label">Home</span>
  </button>
  <button class="tab-item" onclick="switchView('features')" data-tab="features">
    <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/></svg>
    <span class="tab-label">Features</span>
  </button>
  <button class="tab-item" onclick="switchView('arch')" data-tab="arch">
    <svg viewBox="0 0 20 20" fill="none"><path d="M10 3V7M10 7L5 11M10 7L15 11M5 11V15M15 11V15M5 15H15" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="10" cy="3" r="1.5" stroke="currentColor" stroke-width="1"/><circle cx="5" cy="11" r="1.5" stroke="currentColor" stroke-width="1"/><circle cx="15" cy="11" r="1.5" stroke="currentColor" stroke-width="1"/></svg>
    <span class="tab-label">Arch</span>
  </button>
  <button class="tab-item" onclick="switchView('quality')" data-tab="quality">
    <svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.5 7.2L18 8L14 12L15 17.5L10 14.8L5 17.5L6 12L2 8L7.5 7.2L10 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
    <span class="tab-label">Quality</span>
  </button>
</div>

<script>
let currentView = 'home';
const viewIds = { home:'view-home', features:'view-features', arch:'view-arch', quality:'view-quality' };
const viewOrder = ['home','features','arch','quality'];

function switchView(name) {
  if (name === currentView) return;
  const oldIdx = viewOrder.indexOf(currentView);
  const newIdx = viewOrder.indexOf(name);
  const goingRight = newIdx > oldIdx;

  const oldView = document.getElementById(viewIds[currentView]);
  const newView = document.getElementById(viewIds[name]);

  // Exit old view
  oldView.classList.remove('active');
  oldView.style.transform = goingRight ? 'translateX(-20px)' : 'translateX(20px)';
  oldView.style.opacity = '0';
  oldView.style.pointerEvents = 'none';

  // Enter new view
  newView.style.transition = 'none';
  newView.style.transform = goingRight ? 'translateX(20px)' : 'translateX(-20px)';
  newView.style.opacity = '0';
  newView.offsetHeight; // force reflow
  newView.style.transition = '';
  newView.classList.add('active');
  newView.style.transform = 'translateX(0)';
  newView.style.opacity = '1';
  newView.style.pointerEvents = 'auto';

  // Update tabs
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="'+name+'"]').classList.add('active');

  currentView = name;
}

function toggleFeature(idx) {
  const el = document.getElementById('feat-' + idx);
  const chev = document.getElementById('chev-' + idx);
  el.classList.toggle('open');
  chev.classList.toggle('open');
}
</script>

</body></html>`
}

export default function SandboxPanel({ context, messages, status }: SandboxPanelProps) {
  const [tab, setTab] = useState<Tab>('sandbox')

  const sandboxHtml = useMemo(() => {
    if (!context) return null
    return generateContextHtml(context)
  }, [context])

  const statusMessages = messages.filter((m) => m.metadata?.type === 'status')

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-terminal-border">
        <button
          onClick={() => setTab('sandbox')}
          className={`flex-1 text-xs py-1.5 text-center transition-colors ${tab === 'sandbox' ? 'text-terminal-accent border-b border-terminal-accent' : 'text-terminal-dim hover:text-terminal-text'}`}
        >
          sandbox
        </button>
        <button
          onClick={() => setTab('ops')}
          className={`flex-1 text-xs py-1.5 text-center transition-colors ${tab === 'ops' ? 'text-terminal-accent border-b border-terminal-accent' : 'text-terminal-dim hover:text-terminal-text'}`}
        >
          ops
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === 'sandbox' ? (
          sandboxHtml ? (
            <iframe
              srcDoc={sandboxHtml}
              sandbox="allow-scripts"
              className="w-full h-full border-none"
              title="Sandbox preview"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
              <div className="text-terminal-dim text-xs mb-3">.: sandbox</div>
              <div className="border border-terminal-border/30 rounded p-6 max-w-[200px]">
                <div className="text-terminal-dim/40 text-xs mb-2">mini-app will render here</div>
                <div className="text-terminal-border text-[10px]">powered by Cloudflare Workers</div>
              </div>
              <div className="mt-4 text-terminal-dim/30 text-[10px]">
                analyze a repo to see the preview
              </div>
            </div>
          )
        ) : (
          <div className="overflow-y-auto p-3">
            <div className="text-terminal-accent text-xs mb-2">.: operations</div>
            <div className="space-y-0.5">
              {statusMessages.length === 0 ? (
                <div className="text-terminal-dim/40 text-xs">.: waiting...</div>
              ) : (
                statusMessages.map((msg, i) => {
                  const t = new Date(msg.timestamp)
                  return (
                    <div key={i} className="text-terminal-dim text-xs flex gap-2">
                      <span className="text-terminal-dim/40 shrink-0">[{String(t.getHours()).padStart(2, '0')}:{String(t.getMinutes()).padStart(2, '0')}]</span>
                      <span>{msg.content}</span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Features status */}
            {context && context.features.length > 0 && (
              <div className="mt-4">
                <div className="text-terminal-text text-xs font-medium mb-1">.: features</div>
                {context.features.map((f) => {
                  const discussed = messages.some(
                    (m) => (m.role === 'nova' || m.role === 'aero') && m.content.toLowerCase().includes(f.name.toLowerCase()),
                  )
                  return (
                    <div key={f.id} className="text-xs flex items-center gap-2 py-0.5">
                      <span className={discussed ? 'text-dot-green' : 'text-terminal-dim/30'}>{discussed ? '[ok]' : '[  ]'}</span>
                      <span className={discussed ? 'text-terminal-text' : 'text-terminal-dim'}>{f.name}</span>
                      <span className="text-terminal-dim/30 text-[10px]">{f.complexity}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Workers */}
            <div className="mt-4">
              <div className="text-terminal-text text-xs font-medium mb-1">.: workers</div>
              {['Orchestrator', 'Nova (PM)', 'Aero (Dev)'].map((name) => (
                <div key={name} className="text-xs flex gap-3 py-0.5">
                  <span className={`w-24 ${status !== 'idle' ? 'text-terminal-accent' : 'text-terminal-dim'}`}>{name}</span>
                  <span className={status !== 'idle' ? 'text-terminal-accent animate-pulse' : 'text-terminal-dim/40'}>
                    {status !== 'idle' ? 'active' : 'idle'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
