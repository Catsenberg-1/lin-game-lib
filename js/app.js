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
  // 主页 → 牌阵选择
  // ========================
  document.getElementById('btn-tarot').addEventListener('click', () => {
    showView('spreadSelect');
  });

  document.getElementById('btn-zhouyi').addEventListener('click', () => {
    showView('zhouyi');
  });

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
