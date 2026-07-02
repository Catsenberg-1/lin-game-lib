// ============================================================
// 占卜网页 — 主逻辑
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 元素 ---
  const views = {
    home:    document.getElementById('view-home'),
    tarot:   document.getElementById('view-tarot'),
    zhouyi:  document.getElementById('view-zhouyi'),
  };

  const cardsContainer = document.getElementById('cards-container');
  const shuffleOverlay = document.getElementById('shuffle-overlay');

  let currentCards = [];

  // --- 视图切换 ---
  function showView(name) {
    Object.keys(views).forEach(key => {
      views[key].classList.remove('active');
    });
    if (views[name]) {
      views[name].classList.add('active');
    }
  }

  // --- 绑定主页按钮 ---
  document.getElementById('btn-tarot').addEventListener('click', () => {
    showView('tarot');
    startDraw();
  });

  document.getElementById('btn-zhouyi').addEventListener('click', () => {
    showView('zhouyi');
  });

  // --- 返回按钮 ---
  document.getElementById('btn-back-home').addEventListener('click', () => {
    showView('home');
  });

  document.getElementById('btn-back-zhouyi').addEventListener('click', () => {
    showView('home');
  });

  // --- 重新抽牌 ---
  document.getElementById('btn-redraw').addEventListener('click', () => {
    startDraw();
  });

  // --- 抽牌流程 ---
  function startDraw() {
    // 清空当前卡牌
    cardsContainer.innerHTML = '';

    // 显示洗牌动画
    shuffleOverlay.classList.add('active');

    // 模拟洗牌延迟
    setTimeout(() => {
      // 随机抽 3 张
      currentCards = drawCards(3);

      // 隐藏洗牌动画
      shuffleOverlay.classList.remove('active');

      // 渲染卡牌
      renderCards(currentCards);
    }, 1200);
  }

  // --- 渲染卡牌 ---
  function renderCards(cards) {
    cardsContainer.innerHTML = '';

    cards.forEach((card, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'card-wrapper';
      wrapper.style.animationDelay = `${index * 0.15}s`;

      const badgeClass = card.type === 'major' ? 'badge-major' : 'badge-minor';
      const frontClass = card.type === 'major' ? 'major' : 'minor';
      const typeLabel = card.type === 'major' ? '大阿卡纳' : `小阿卡纳 · ${card.suitZh}`;

      wrapper.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back">
            <div class="card-back-pattern">✦</div>
            <div class="card-back-text">塔 罗</div>
          </div>
          <div class="card-face card-front ${frontClass}">
            <span class="card-type-badge ${badgeClass}">${typeLabel}</span>
            <div class="card-name-zh">${card.nameZh}</div>
            <div class="card-name-en">${card.nameEn}</div>
            <div class="card-keywords">${card.keywords}</div>
            <div class="card-meaning">${card.meaning}</div>
            <div class="card-hint">点击卡牌翻面</div>
          </div>
        </div>
      `;

      // 点击翻转
      wrapper.addEventListener('click', () => {
        if (!wrapper.classList.contains('flipped')) {
          wrapper.classList.add('flipped');
        }
      });

      cardsContainer.appendChild(wrapper);
    });
  }
});
