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
  // 主页动态按钮（从 btn-editor.html 保存的配置读取）
  // ========================
  function applyHomeButtons() {
    const scene = document.getElementById('bg-scene');
    if (!scene) return;

    // 清除旧按钮
    scene.querySelectorAll('.dyn-btn').forEach(el => el.remove());

    // 读取配置
    let btns = [];
    try {
      btns = JSON.parse(localStorage.getItem('divination_btns') || '[]');
    } catch(e) {}

    // 默认按钮（统一风格：大圆角 + 亮眼文字）
    if (btns.length === 0) {
      btns = [
        { id:1, name:'🔮 塔罗占卜', shape:'rounded', x:21.46, y:68.80, w:14, h:8, opacity:0.25, fill:'rgba(60,20,80,0.7)', stroke:'#e0c878', strokeW:2, color:'#ffd700', fontSize:0.55, href:'tarot' },
        { id:2, name:'☯ 周易占卜', shape:'rounded', x:61.59, y:81.80, w:14, h:8, opacity:0.25, fill:'rgba(60,20,80,0.7)', stroke:'#e0c878', strokeW:2, color:'#ffd700', fontSize:0.55, href:'zhouyi' },
      ];
    }

    btns.filter(b => b.href).forEach(b => {
      const el = document.createElement('button');
      el.className = 'dyn-btn';
      el.textContent = b.shape === 'circle' && !b.name ? '' : (b.name || '');
      el.style.left = b.x + '%';
      el.style.top = b.y + '%';
      el.style.width = b.w + '%';
      el.style.height = b.h + '%';
      el.style.opacity = b.opacity;
      el.style.background = b.fill;
      el.style.border = b.strokeW + 'px solid ' + b.stroke;
      el.style.color = b.color;
      el.style.fontSize = b.fontSize + 'rem';
      el.style.position = 'absolute';
      el.style.cursor = 'pointer';
      el.style.zIndex = '20';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.transition = 'all 0.3s ease';
      el.style.borderRadius = b.shape === 'circle' ? '50%' : b.shape === 'rounded' ? '12px' : b.shape === 'oval' ? '50%' : '2px';

      // hover 效果
      el.addEventListener('mouseenter', () => {
        el.style.opacity = Math.min(1, b.opacity * 3);
        el.style.boxShadow = '0 0 20px ' + b.stroke;
      });
      el.addEventListener('mouseleave', () => {
        el.style.opacity = b.opacity;
        el.style.boxShadow = 'none';
      });

      // 点击跳转
      const href = b.href || '';
      el.addEventListener('click', () => {
        if (href === 'tarot' || href === '#tarot') showView('spreadSelect');
        else if (href === 'zhouyi' || href === '#zhouyi') showView('zhouyi');
        else if (href.startsWith('#') || href.startsWith('/')) showView(href.replace('#', '').replace('/', ''));
      });

      scene.appendChild(el);
    });
  }

  applyHomeButtons();

  // 牌阵选择 → 返回主页
  document.getElementById('btn-back-from-spread').addEventListener('click', () => {
    showView('home');
  });

  // 牌阵卡片点击直接进入抽牌
  document.querySelectorAll('.spread-card:not(.disabled)').forEach(card => {
    card.addEventListener('click', () => {
      currentSpread = card.dataset.spread;
      showView('tarotDraw');
      startFanDraw();
    });
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
  // 渲染圆形牌阵
  // ========================
  function renderFan() {
    fanContainer.innerHTML = '';
    const total = fanDeck.length;

    const stage = document.querySelector('.fan-stage');
    const stageW = stage.clientWidth;
    const stageH = stage.clientHeight;
    const cx = stageW / 2;
    const cy = stageH / 2;
    const radius = Math.min(stageW, stageH) * 0.40;

    fanDeck.forEach((card, i) => {
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const rotate = (angle * 180) / Math.PI + 90;
      const halfW = 22;
      const halfH = 35;

      const el = document.createElement('div');
      el.className = 'fan-card';
      el.dataset.index = i;
      el.style.width = '44px';
      el.style.height = '70px';
      el.style.transform = `translate(${cx - halfW}px, ${cy - halfH}px) rotate(0deg) scale(0.2)`;
      el.style.opacity = '0';
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';

      el.innerHTML = `<div class="fan-card-inner"></div>`;

      el.addEventListener('click', (e) => onCardClick(i, el, e));

      fanContainer.appendChild(el);

      setTimeout(() => {
        el.style.transform = `translate(${x - halfW}px, ${y - halfH}px) rotate(${rotate}deg) scale(1)`;
        el.style.opacity = '1';
        el.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      }, 30 + i * 10);
    });
  }

  // ========================
  // 卡牌点击 — 选中消失，无高亮
  // ========================
  function onCardClick(index, el, event) {
    // 已选中 → 取消选中（恢复）
    if (el.classList.contains('picked')) {
      el.classList.remove('picked');
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      const pos = selectedIndices.indexOf(index);
      if (pos >= 0) selectedIndices.splice(pos, 1);
      updateSlots();
      drawTitle.textContent = selectedIndices.length > 0
        ? `🃏 已选 ${selectedIndices.length} / 3 张牌`
        : '🃏 请从选中 3 张牌';
      confirmBtn.disabled = true;
      return;
    }

    if (selectedIndices.length >= 3) return;

    // 直接透明消失
    el.classList.add('picked');
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    selectedIndices.push(index);

    updateSlots();
    drawTitle.textContent = `🃏 已选 ${selectedIndices.length} / 3 张牌`;

    if (selectedIndices.length === 3) {
      confirmBtn.disabled = false;
      drawTitle.textContent = '✨ 已选 3 张，请确认';
    }
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
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
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
