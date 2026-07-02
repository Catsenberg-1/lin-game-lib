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
  let currentSpread  = 'no-spread';   // 当前牌阵
  let selectedCards  = [];            // 已选中的牌索引
  let fanDeck        = [];            // 洗牌后的 78 张牌顺序
  let drawnCards     = [];            // 最终抽出的 3 张牌数据

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
    selectedCards = [];
    updateSelectionUI();
    showView('spreadSelect');
  });

  // 确认选择 → 进入结果
  confirmBtn.addEventListener('click', () => {
    if (selectedCards.length === 3) {
      showResults();
    }
  });

  // 清除重选
  clearBtn.addEventListener('click', () => {
    clearSelection();
  });

  // 结果页 → 返回选牌
  document.getElementById('btn-result-back').addEventListener('click', () => {
    showView('spreadSelect');
  });

  // 重新洗牌
  document.getElementById('btn-redraw').addEventListener('click', () => {
    showView('tarotDraw');
    startFanDraw();
  });

  // 周易返回
  document.getElementById('btn-back-zhouyi').addEventListener('click', () => {
    showView('home');
  });

  // ========================
  // Loading 动画 — 扇面360°展开收起
  // ========================
  function showLoading(duration = 2200) {
    return new Promise(resolve => {
      // 生成 loading 卡牌
      loadingFan.innerHTML = '';
      const cardCount = 36;
      for (let i = 0; i < cardCount; i++) {
        const card = document.createElement('div');
        card.className = 'loading-card';
        card.style.setProperty('--angle', `${(i / cardCount) * 360}deg`);
        card.style.animationDelay = `${(i / cardCount) * 0.4}s`;
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
  // 扇面抽牌流程
  // ========================
  async function startFanDraw() {
    // 重置
    selectedCards = [];
    drawnCards = [];
    updateSelectionUI();
    confirmBtn.disabled = true;

    // 洗牌效果
    await showLoading(2200);

    // 洗牌：随机排列 78 张
    fanDeck = [...getAllCards()].sort(() => Math.random() - 0.5);

    // 渲染扇面
    renderFan();
  }

  // ========================
  // 渲染扇面
  // ========================
  function renderFan() {
    fanContainer.innerHTML = '';
    const total = fanDeck.length; // 78

    // 扇面参数
    const stage = document.querySelector('.fan-stage');
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    // 扇面圆心在底部偏下（制造弧形效果）
    const cx = stageWidth / 2;
    const cy = stageHeight + 120;

    // 半径
    const radius = Math.min(stageWidth * 0.65, 520);

    // 角度范围：中间重叠少，两侧展开
    const arcDeg = Math.min(140, 100 + (78 / 100) * 40);
    const startAngle = -arcDeg / 2;
    const endAngle = arcDeg / 2;

    // 先计算所有位置
    const positions = [];
    fanDeck.forEach((card, i) => {
      const angleDeg = startAngle + (i / (total - 1)) * (endAngle - startAngle);
      const angleRad = (angleDeg * Math.PI) / 180;

      const x = cx + radius * Math.sin(angleRad);
      const y = cy - radius * Math.cos(angleRad);

      positions.push({ x, y, angleDeg, rotate: angleDeg * 0.7 });
    });

    // 创建卡牌 DOM
    fanDeck.forEach((card, i) => {
      const { x, y, rotate } = positions[i];
      const halfW = 30;
      const halfH = 48;

      const el = document.createElement('div');
      el.className = 'fan-card';
      el.dataset.index = i;

      // 起始状态：从中心飞出
      el.style.transform = `translate(${cx - halfW}px, ${cy - halfH - 150}px) rotate(0deg) scale(0.3)`;
      el.style.opacity = '0';
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';

      el.innerHTML = `<div class="fan-card-inner"></div>`;

      // 点击事件
      el.addEventListener('click', () => onCardClick(i, el));

      fanContainer.appendChild(el);

      // 延迟后飞入最终位置
      setTimeout(() => {
        el.style.transform = `translate(${x - halfW}px, ${y - halfH}px) rotate(${rotate}deg) scale(1)`;
        el.style.opacity = '1';
        el.style.transition = 'transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease';
      }, 30 + i * 10);
    });
  }

  // ========================
  // 卡牌点击处理
  // ========================
  function onCardClick(index, el) {
    // 检查是否已选中
    const alreadyIdx = selectedCards.indexOf(index);

    if (alreadyIdx >= 0) {
      // 取消选中
      selectedCards.splice(alreadyIdx, 1);
      el.classList.remove('selected');
    } else {
      if (selectedCards.length >= 3) {
        // 已满 3 张，先取消最早的一张
        const removedIdx = selectedCards.shift();
        const removedEl = fanContainer.querySelector(`[data-index="${removedIdx}"]`);
        if (removedEl) removedEl.classList.remove('selected');
      }
      selectedCards.push(index);
      el.classList.add('selected');
    }

    updateSelectionUI();
    drawTitle.textContent = `🃏 已选 ${selectedCards.length} / 3 张牌`;
  }

  // ========================
  // 已选区 UI 更新
  // ========================
  function updateSelectionUI() {
    selectedCardsEl.innerHTML = '';

    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div');
      slot.className = 'selected-slot';

      if (i < selectedCards.length) {
        slot.classList.add('filled');
        const cardData = fanDeck[selectedCards[i]];
        slot.textContent = cardData.nameZh;
        slot.title = cardData.nameEn;
      } else {
        slot.textContent = `第${i + 1}张`;
      }

      selectedCardsEl.appendChild(slot);
    }

    // 更新按钮状态
    confirmBtn.disabled = selectedCards.length !== 3;
    confirmBtn.textContent = `确认选择 (${selectedCards.length}/3)`;

    if (selectedCards.length > 0) {
      clearBtn.style.display = 'inline-block';
    } else {
      clearBtn.style.display = 'none';
    }
  }

  // ========================
  // 清除选择
  // ========================
  function clearSelection() {
    // 移除所有选中状态
    document.querySelectorAll('.fan-card.selected').forEach(el => {
      el.classList.remove('selected');
    });
    selectedCards = [];
    updateSelectionUI();
    drawTitle.textContent = '🃏 请从扇面中选取 3 张牌';
  }

  // ========================
  // 显示结果
  // ========================
  function showResults() {
    // 获取选中的牌数据
    drawnCards = selectedCards.map(i => fanDeck[i]);

    // 切换到结果视图
    showView('tarotResult');

    // 渲染结果卡牌
    renderResults();
  }

  // ========================
  // 渲染结果卡牌
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
        // 保存当前选中
        const savedSelection = [...selectedCards];
        renderFan();
        // 恢复选中状态
        savedSelection.forEach(idx => {
          const el = fanContainer.querySelector(`[data-index="${idx}"]`);
          if (el) {
            el.classList.add('selected');
            // 需要等动画结束后设置 transform
            setTimeout(() => {
              el.style.transform = el.style.transform; // keep
            }, 700);
          }
        });
      }
    }, 300);
  });

});
