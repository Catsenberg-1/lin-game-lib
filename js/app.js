// ============================================================
// 占卜网页 — 主逻辑
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ========================
  // DOM 元素
  // ========================
  const views = {
    home:          document.getElementById('view-home'),
    spreadSelect:  document.getElementById('view-spread-select'),
    tarotDraw:     document.getElementById('view-tarot-draw'),
    tarotResult:   document.getElementById('view-tarot-result'),
    zhouyi:        document.getElementById('view-zhouyi'),
  };

  const fanContainer    = document.getElementById('fan-container');
  const selectedCardsEl = document.getElementById('selected-cards');
  const confirmBtn      = document.getElementById('btn-confirm-pick');
  const clearBtn        = document.getElementById('btn-clear-pick');
  const loadingOverlay  = document.getElementById('loading-overlay');
  const loadingFan      = document.getElementById('loading-fan');
  const drawTitle       = document.getElementById('draw-title');
  const resultCardsEl   = document.getElementById('result-cards');

  // ========================
  // 状态
  // ========================
  let currentSpread  = 'no-spread';
  let selectedIndices = [];        // 已选中的牌在 fanDeck 中的索引
  let fanDeck        = [];        // 洗牌后的 78 张牌顺序
  let drawnCards     = [];        // 最终抽出的 3 张牌数据

  // ========================
  // 视图切换
  // ========================
  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    if (views[name]) views[name].classList.add('active');
  }

  // ========================
  // 主页热区 — SVG 多边形（从 localStorage 读取）
  // ========================
  function applyHotZones() {
    const hzTarot = document.getElementById('hz-tarot');
    const hzZhouyi = document.getElementById('hz-zhouyi');
    if (!hzTarot || !hzZhouyi) return;

    // 用户手绘的精确热区（全用户默认）
    const defaults = [
      {"name":"塔罗占卜","points":[{"x":14.8,"y":64.78},{"x":12.1,"y":65.27},{"x":9.76,"y":65.92},{"x":7.64,"y":67.46},{"x":5.73,"y":68.94},{"x":5.46,"y":70.88},{"x":5.84,"y":72.48},{"x":6.42,"y":74.12},{"x":7.64,"y":75.53},{"x":9.12,"y":76.67},{"x":7.9,"y":78.37},{"x":7.48,"y":80.13},{"x":8.86,"y":80.8},{"x":10.19,"y":81.33},{"x":12.15,"y":81.64},{"x":14.11,"y":81.79},{"x":16.76,"y":81.82},{"x":19.05,"y":83.12},{"x":16.29,"y":84.1},{"x":12.04,"y":86.01},{"x":9.28,"y":87.12},{"x":9.12,"y":89.34},{"x":11.3,"y":90.14},{"x":15.92,"y":90.73},{"x":17.19,"y":91.44},{"x":19.95,"y":91.78},{"x":22.02,"y":92.49},{"x":24.4,"y":92.55},{"x":26.1,"y":91.99},{"x":29.18,"y":92.64},{"x":33.16,"y":91.28},{"x":38.94,"y":85.83},{"x":36.6,"y":84.84},{"x":31.3,"y":82.35},{"x":26.9,"y":79.45},{"x":25.94,"y":77.35},{"x":25.57,"y":75.9},{"x":26.63,"y":74.24},{"x":27.16,"y":72.57},{"x":28.06,"y":70.76},{"x":27.06,"y":68.66},{"x":25.52,"y":67.06},{"x":23.34,"y":65.79},{"x":21.17,"y":65.64},{"x":19.95,"y":65.21},{"x":17.19,"y":64.81},{"x":14.8,"y":64.78}]},
      {"name":"周易占卜","points":[{"x":59.26,"y":81.11},{"x":56.76,"y":83.24},{"x":56.07,"y":84.93},{"x":56.23,"y":87.15},{"x":57.98,"y":88.51},{"x":59.42,"y":91.16},{"x":54.75,"y":90.88},{"x":50.82,"y":90.39},{"x":47.16,"y":90.14},{"x":44.4,"y":89.87},{"x":41.8,"y":90.33},{"x":39.05,"y":91.99},{"x":39.84,"y":94.49},{"x":41.54,"y":94.92},{"x":44.93,"y":95.38},{"x":47.43,"y":95.23},{"x":50.45,"y":95.75},{"x":53.47,"y":95.88},{"x":57.08,"y":96.09},{"x":61.43,"y":96.52},{"x":62.86,"y":96.34},{"x":65.89,"y":95.41},{"x":77.88,"y":91.13},{"x":83.61,"y":90.67},{"x":63.34,"y":80.62},{"x":70.29,"y":79.42},{"x":62.76,"y":81.02},{"x":74.64,"y":79.85},{"x":78.09,"y":80},{"x":82.97,"y":80.65},{"x":86.42,"y":81.98},{"x":88.7,"y":82.93},{"x":89.92,"y":84.13},{"x":90.56,"y":85.55},{"x":90.61,"y":87.62},{"x":85.89,"y":89.47},{"x":59.26,"y":81.11}]},
    ];

    // localStorage 优先（用户自定义覆盖），否则用内置默认
    let data = defaults;
    try {
      const saved = JSON.parse(localStorage.getItem('divination_hotzones_v2') || '[]');
      if (saved.length >= 2 && saved[0].points && saved[1].points) {
        data = saved;
      }
    } catch(e) {}

    const polys = [hzTarot, hzZhouyi];
    polys.forEach((el, i) => {
      if (data[i] && data[i].points) {
        el.setAttribute('points', data[i].points.map(p => `${p.x},${p.y}`).join(' '));
      }
    });

    hzTarot.addEventListener('click', () => showView('spreadSelect'));
    hzZhouyi.addEventListener('click', () => showView('zhouyi'));
  }

  applyHotZones();

  // 牌阵选择 → 返回主页
  document.getElementById('btn-back-from-spread').addEventListener('click', () => {
    showView('home');
  });

  // 牌阵卡片点击切换
  document.querySelectorAll('.spread-card:not(.disabled)').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.spread-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentSpread = card.dataset.spread;
    });
  });

  // 开始抽牌 → 进入扇面选牌
  document.getElementById('btn-start-draw').addEventListener('click', () => {
    showView('tarotDraw');
    startFanDraw();
  });

  // 返回牌阵选择
  document.getElementById('btn-back-to-spread').addEventListener('click', () => {
    selectedIndices = [];
    updateSlots();
    showView('spreadSelect');
  });

  // 确认选择 → 进入结果
  confirmBtn.addEventListener('click', () => {
    if (selectedIndices.length === 3) {
      showResults();
    }
  });

  // 清除重选
  clearBtn.addEventListener('click', () => {
    clearSelection();
  });

  // 结果页 → 返回牌阵
  document.getElementById('btn-result-back').addEventListener('click', () => {
    showView('spreadSelect');
  });

  // 重新洗牌（从结果页）
  document.getElementById('btn-redraw').addEventListener('click', () => {
    showView('tarotDraw');
    startFanDraw();
  });

  // 周易返回
  document.getElementById('btn-back-zhouyi').addEventListener('click', () => {
    showView('home');
  });

  // ========================
  // Loading 动画 — 扇面 360° 展开收起
  // ========================
  function showLoading(duration = 2200) {
    return new Promise(resolve => {
      loadingFan.innerHTML = '';
      const cardCount = 36;
      for (let i = 0; i < cardCount; i++) {
        const card = document.createElement('div');
        card.className = 'loading-card';
        card.style.setProperty('--angle', `${(i / cardCount) * 360}deg`);
        card.style.animationDelay = `${(i / cardCount) * 0.3}s`;
        loadingFan.appendChild(card);
      }

      loadingOverlay.classList.add('active');

      setTimeout(() => {
        loadingOverlay.classList.remove('active');
        resolve();
      }, duration);
    });
  }

  // ========================
  // 扇面抽牌流程入口
  // ========================
  async function startFanDraw() {
    selectedIndices = [];
    drawnCards = [];
    updateSlots();
    confirmBtn.disabled = true;
    drawTitle.textContent = '🃏 请从扇面中选取 3 张牌';

    await showLoading(2200);

    fanDeck = [...getAllCards()].sort(() => Math.random() - 0.5);
    renderFan();
  }

  // ========================
  // 渲染扇面
  // ========================
  function renderFan() {
    fanContainer.innerHTML = '';
    const total = fanDeck.length;

    const stage = document.querySelector('.fan-stage');
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    const cx = stageWidth / 2;
    const cy = stageHeight + 120;
    const radius = Math.min(stageWidth * 0.65, 520);
    const arcDeg = 140;
    const startAngle = -arcDeg / 2;
    const endAngle = arcDeg / 2;

    fanDeck.forEach((card, i) => {
      const angleDeg = startAngle + (i / (total - 1)) * (endAngle - startAngle);
      const angleRad = (angleDeg * Math.PI) / 180;

      const x = cx + radius * Math.sin(angleRad);
      const y = cy - radius * Math.cos(angleRad);
      const rotate = angleDeg * 0.7;
      const halfW = 30;
      const halfH = 48;

      const el = document.createElement('div');
      el.className = 'fan-card';
      el.dataset.index = i;
      el.style.transform = `translate(${cx - halfW}px, ${cy - halfH - 150}px) rotate(0deg) scale(0.3)`;
      el.style.opacity = '0';
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';

      el.innerHTML = `<div class="fan-card-inner"></div>`;

      el.addEventListener('click', (e) => onCardClick(i, el, e));

      fanContainer.appendChild(el);

      // 飞入最终位置
      setTimeout(() => {
        el.style.transform = `translate(${x - halfW}px, ${y - halfH}px) rotate(${rotate}deg) scale(1)`;
        el.style.opacity = '1';
        el.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      }, 30 + i * 10);
    });
  }

  // ========================
  // 卡牌点击 — 选中/取消 飞入卡槽
  // ========================
  function onCardClick(index, el, event) {
    // 如果已选中 → 取消选中
    if (el.classList.contains('picked')) {
      el.classList.remove('picked');
      el.style.pointerEvents = '';
      const pos = selectedIndices.indexOf(index);
      if (pos >= 0) {
        selectedIndices.splice(pos, 1);
      }
      updateSlots();
      drawTitle.textContent = selectedIndices.length > 0
        ? `🃏 已选 ${selectedIndices.length} / 3 张牌`
        : '🃏 请从扇面中选取 3 张牌';
      confirmBtn.disabled = true;
      return;
    }

    // 已满 3 张，不允许再加
    if (selectedIndices.length >= 3) return;

    // 标记为已选
    el.classList.add('picked');
    selectedIndices.push(index);

    // 飞行动画
    const cardRect = el.getBoundingClientRect();
    const slotIndex = selectedIndices.length - 1;
    flyCardToSlot(cardRect, slotIndex);

    updateSlots();
    drawTitle.textContent = `🃏 已选 ${selectedIndices.length} / 3 张牌`;

    if (selectedIndices.length === 3) {
      confirmBtn.disabled = false;
      drawTitle.textContent = '✨ 已选 3 张，请确认';
    }
  }

  // ========================
  // 卡牌飞入卡槽动画
  // ========================
  function flyCardToSlot(fromRect, slotIndex) {
    // 获取目标卡槽位置
    const slots = selectedCardsEl.querySelectorAll('.selected-slot');
    const targetSlot = slots[slotIndex];
    if (!targetSlot) return;

    const toRect = targetSlot.getBoundingClientRect();

    // 创建飞行克隆
    const fly = document.createElement('div');
    fly.className = 'fly-card';
    fly.style.position = 'fixed';
    fly.style.left = fromRect.left + 'px';
    fly.style.top = fromRect.top + 'px';
    fly.style.width = fromRect.width + 'px';
    fly.style.height = fromRect.height + 'px';
    fly.style.transform = 'rotate(0deg)';
    fly.style.transition = 'none';
    document.body.appendChild(fly);

    // 强制 reflow 再设置目标
    fly.offsetHeight;

    const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);

    fly.style.transition = 'all 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(${toRect.width / fromRect.width})`;

    // 动画结束后移除克隆，高亮卡槽
    fly.addEventListener('transitionend', () => {
      fly.remove();
      // 卡槽弹跳
      targetSlot.classList.add('filled');
      targetSlot.offsetHeight;
    });
  }

  // ========================
  // 更新底部卡槽显示
  // ========================
  function updateSlots() {
    // 保留已有 slot 元素，只更新状态
    const existingSlots = selectedCardsEl.querySelectorAll('.selected-slot');
    const existingArr = Array.from(existingSlots);

    // 如果 slot 数量不对，重建
    if (existingArr.length !== 3) {
      selectedCardsEl.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const slot = document.createElement('div');
        slot.className = 'selected-slot';
        if (i < selectedIndices.length) {
          slot.classList.add('filled');
        } else {
          slot.textContent = `第${i + 1}张`;
        }
        selectedCardsEl.appendChild(slot);
      }
    } else {
      // 只更新每个 slot 的 class
      existingArr.forEach((slot, i) => {
        if (i < selectedIndices.length) {
          if (!slot.classList.contains('filled')) {
            slot.classList.add('filled');
            slot.textContent = '';
          }
        } else {
          slot.classList.remove('filled');
          slot.textContent = `第${i + 1}张`;
        }
      });
    }

    confirmBtn.disabled = selectedIndices.length !== 3;
    confirmBtn.textContent = `确认选择 (${selectedIndices.length}/3)`;

    clearBtn.style.display = selectedIndices.length > 0 ? 'inline-block' : 'none';
  }

  // ========================
  // 清除选择
  // ========================
  function clearSelection() {
    document.querySelectorAll('.fan-card.picked').forEach(el => {
      el.classList.remove('picked');
      el.style.pointerEvents = '';
    });
    selectedIndices = [];
    updateSlots();
    confirmBtn.disabled = true;
    drawTitle.textContent = '🃏 请从扇面中选取 3 张牌';
  }

  // ========================
  // 显示结果
  // ========================
  function showResults() {
    drawnCards = selectedIndices.map(i => fanDeck[i]);
    incrementCount(); // 累计占卜次数 +1
    showView('tarotResult');
    renderResults();
  }

  // ========================
  // 渲染结果卡牌（背面朝上，点击翻转）
  // ========================
  function renderResults() {
    resultCardsEl.innerHTML = '';

    drawnCards.forEach((card, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'card-wrapper';

      const badgeClass = card.type === 'major' ? 'badge-major' : 'badge-minor';
      const frontClass = card.type === 'major' ? 'major' : 'minor';
      const typeLabel = card.type === 'major' ? '大阿卡纳' : `小阿卡纳 · ${card.suitZh || ''}`;

      wrapper.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back">
            <div class="card-back-pattern">✦</div>
            <div class="card-back-text">第 ${index + 1} 张</div>
          </div>
          <div class="card-face card-front ${frontClass}">
            <span class="card-type-badge ${badgeClass}">${typeLabel}</span>
            <div class="card-name-zh">${card.nameZh}</div>
            <div class="card-name-en">${card.nameEn}</div>
            <div class="card-keywords">${card.keywords}</div>
            <div class="card-meaning">${card.meaning}</div>
            <div class="card-hint">点击翻面</div>
          </div>
        </div>
      `;

      wrapper.addEventListener('click', () => {
        wrapper.classList.toggle('flipped');
      });

      resultCardsEl.appendChild(wrapper);
    });
  }

  // ========================
  // 神秘学累计计数（全用户实时同步）
  // ========================
  const COUNTER_API = '/.netlify/functions/counter';
  const STORAGE_KEY = 'divination_local_fallback';

  // 从后端获取全用户累计计数
  async function fetchTotalCount() {
    try {
      const res = await fetch(COUNTER_API);
      const data = await res.json();
      if (data.count !== undefined) return data.count;
    } catch (e) {
      // 本地开发或无网络时，回退 localStorage
    }
    const local = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    return local;
  }

  // 递增全用户累计计数
  async function incrementCount() {
    try {
      const res = await fetch(COUNTER_API, { method: 'POST' });
      const data = await res.json();
      if (data.count !== undefined) {
        updateMysticDisplay(data.count);
        return;
      }
    } catch (e) {
      // 回退 localStorage
    }
    const local = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEY, local.toString());
    updateMysticDisplay(local);
  }

  async function updateMysticDisplay(knownCount) {
    const countEl = document.getElementById('mystic-count');
    const shrinkEl = document.getElementById('mystic-shrink');
    if (!countEl || !shrinkEl) return;

    let total;
    if (knownCount !== undefined) {
      total = knownCount;
    } else {
      total = await fetchTotalCount();
    }

    countEl.textContent = total.toLocaleString();

    // 后半句逐字缩小
    const text = '据说占卜总数越多，牌灵的力量更强哦';
    shrinkEl.innerHTML = '';
    const chars = [...text];
    const startSize = 1.15;
    const endSize = 0.45;

    chars.forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'mystic-char';
      const ratio = i / (chars.length - 1);
      const size = startSize + (endSize - startSize) * ratio;
      span.style.fontSize = size + 'rem';
      span.textContent = char;
      shrinkEl.appendChild(span);
    });
  }

  // 页面加载时获取计数
  updateMysticDisplay();

  // ========================
  // 窗口大小变化时重渲染扇面
  // ========================
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (views.tarotDraw.classList.contains('active') && fanDeck.length > 0) {
        const saved = [...selectedIndices];
        renderFan();
        // 恢复已选标记
        saved.forEach(idx => {
          const el = fanContainer.querySelector(`[data-index="${idx}"]`);
          if (el) el.classList.add('picked');
        });
      }
    }, 500);
  });

});
