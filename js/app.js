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

  // ========================
  // 周易 · 六爻起卦
  // ========================
  const TRIGRAMS = ['☷坤','☶艮','☵坎','☴巽','☳震','☲离','☱兑','☰乾'];
  const TRIGRAM_NAMES = ['坤','艮','坎','巽','震','离','兑','乾'];
  const HEXAGRAMS = {
    '11':{name:'泰',judge:'天地交泰，万物通。小往大来，吉亨。',desc:'通泰、顺利、上下交融，事业顺遂，万事亨通。'},
    '12':{name:'否',judge:'天地不交，否。不利君子贞，大往小来。',desc:'闭塞、不通、困顿，宜守不宜进，静待时机。'},
    '12':{name:'否',judge:'天地不交，否。',desc:'闭塞不通，宜守不宜进。'},
    '21':{name:'大壮',judge:'大壮，利贞。',desc:'强盛壮大，宜守正。'},
    '22':{name:'夬',judge:'夬，扬于王庭。',desc:'决断、果断，去除小人。'},
    '31':{name:'大有',judge:'大有，元亨。',desc:'丰盛富有，大亨通。'},
    '32':{name:'睽',judge:'睽，小事吉。',desc:'乖离、分歧，小事可成。'},
    '33':{name:'兑',judge:'兑，亨利贞。',desc:'喜悦、言说，人际和谐。'},
    '34':{name:'归妹',judge:'归妹，征凶无攸利。',desc:'婚嫁、结合，宜慎不宜急。'},
    '35':{name:'履',judge:'履虎尾不咥人，亨。',desc:'谨慎行事，如履虎尾，终能亨通。'},
    '36':{name:'中孚',judge:'中孚豚鱼吉，利涉大川。',desc:'诚信、信实，能感化万物。'},
    '37':{name:'睽',judge:'睽，小事吉。',desc:'乖离、分歧，小事可成。'},
    '38':{name:'节',judge:'节亨，苦节不可贞。',desc:'节制、适度，过犹不及。'},
    '41':{name:'小畜',judge:'小畜亨，密云不雨。',desc:'小有积蓄，待时而发。'},
    '42':{name:'需',judge:'需有孚，光亨贞吉，利涉大川。',desc:'等待、需求，诚心守正则吉。'},
    '43':{name:'大畜',judge:'大畜利贞，不家食吉，利涉大川。',desc:'大有积蓄，宜外用不宜家居。'},
    '44':{name:'乾',judge:'乾，元亨利贞。',desc:'刚健不息，创始万物，大吉大利。'},
    '45':{name:'小过',judge:'小过亨利贞，可小事不可大事。',desc:'小有过越，小事可行，大事宜慎。'},
    '46':{name:'大过',judge:'大过栋桡，利有攸往亨。',desc:'大为过越，如梁弯曲，宜变通。'},
    '47':{name:'讼',judge:'讼有孚窒惕，中吉终凶。',desc:'争讼、纠纷，宜和解不宜对抗。'},
    '48':{name:'同人',judge:'同人于野，亨。利涉大川，利君子贞。',desc:'志同道合，团结协作，亨通。'},
    '51':{name:'蛊',judge:'蛊元亨，利涉大川。先甲三日后甲三日。',desc:'整治弊病，拨乱反正。'},
    '52':{name:'姤',judge:'姤女壮，勿用取女。',desc:'邂逅、相遇，宜审慎。'},
    '53':{name:'巽',judge:'巽小亨，利有攸往，利见大人。',desc:'柔顺、渗透，顺势而行。'},
    '54':{name:'井',judge:'井改邑不改井，无丧无得。',desc:'如井养人，不变应万变。'},
    '55':{name:'升',judge:'升元亨，用见大人勿恤，南征吉。',desc:'上升、进取，宜向南。'},
    '56':{name:'蛊',judge:'蛊元亨，利涉大川。',desc:'整治弊病，拨乱反正。'},
    '57':{name:'涣',judge:'涣亨，王假有庙。利涉大川。',desc:'涣散、离散，宜聚合人心。'},
    '58':{name:'渐',judge:'渐女归吉利贞。',desc:'渐进、逐步，如女子出嫁。'},
    '61':{name:'大畜',judge:'大畜利贞。',desc:'大有积蓄。'},
    '62':{name:'困',judge:'困亨贞。大人吉无咎。',desc:'困顿、受困，守正可解。'},
    '63':{name:'鼎',judge:'鼎元吉亨。',desc:'革新、鼎立，去旧迎新。'},
    '64':{name:'未济',judge:'未济亨小狐汔济濡其尾无攸利。',desc:'事未成，如小狐渡河，慎始慎终。'},
    '65':{name:'解',judge:'解利西南。无所往其来复吉。有攸往夙吉。',desc:'解脱、化解，宜速不宜迟。'},
    '66':{name:'蒙',judge:'蒙亨。匪我求童蒙，童蒙求我。',desc:'蒙昧、启蒙，学然后知。'},
    '67':{name:'师',judge:'师贞丈人吉无咎。',desc:'统兵、率众，宜师出有名。'},
    '68':{name:'遁',judge:'遁亨，小利贞。',desc:'退避、隐退，宜适时而退。'},
    '71':{name:'明夷',judge:'明夷利艰贞。',desc:'光明受伤，宜隐忍待时。'},
    '72':{name:'屯',judge:'屯元亨利贞。勿用有攸往。',desc:'初创艰难，如草芽破土，宜守不宜急。'},
    '73':{name:'同人',judge:'同人于野亨。',desc:'志同道合。'},
    '74':{name:'豫',judge:'豫利建侯行师。',desc:'豫悦、安乐，宜行动。'},
    '75':{name:'旅',judge:'旅小亨，旅贞吉。',desc:'行旅、漂泊，宜柔顺守正。'},
    '76':{name:'咸',judge:'咸亨利贞，取女吉。',desc:'感通、感应，如男女相悦。'},
    '77':{name:'艮',judge:'艮其背不获其身，行其庭不见其人。',desc:'止息、静止，知止不殆。'},
    '78':{name:'谦',judge:'谦亨，君子有终。',desc:'谦逊、谦卑，终获善果。'},
    '81':{name:'晋',judge:'晋康侯用锡马蕃庶，昼日三接。',desc:'前进、晋升，如旭日东升。'},
    '82':{name:'比',judge:'比吉。原筮元永贞无咎。',desc:'亲比、团结，择善而从。'},
    '83':{name:'观',judge:'观盥而不荐，有孚颙若。',desc:'观察、审视，宜静观其变。'},
    '84':{name:'坤',judge:'坤，元亨利牝马之贞。君子有攸往，先迷后得主。',desc:'柔顺包容，厚德载物，先迷后得。'},
    '85':{name:'萃',judge:'萃亨，王假有庙，利见大人。',desc:'聚集、会合，人心所向。'},
    '86':{name:'否',judge:'否之匪人，不利君子贞。',desc:'闭塞不通。'},
    '87':{name:'剥',judge:'剥不利有攸往。',desc:'剥落、衰败，君子待时。'},
    '88':{name:'复',judge:'复亨。出入无疾，朋来无咎。',desc:'回复、复兴，一阳来复。'},
  };

  function getHexagramKey(lower, upper) { return String(lower) + String(upper); }
  function getHexagramData(lower, upper) {
    const key = getHexagramKey(lower, upper);
    return HEXAGRAMS[key] || { name:'未名', judge:'卦辞未收录', desc:'请参照易经原文。' };
  }

  let zyCastCount = 0;
  let zyLines = []; // [{value:6|7|8|9, changing:bool}]

  document.getElementById('btn-cast').addEventListener('click', () => {
    if (zyCastCount >= 6) return;
    const coins = document.querySelectorAll('.zy-coin');
    coins.forEach(c => { c.classList.add('tossing'); c.textContent = '🪙'; });
    document.getElementById('zy-hint').textContent = '掷出中...';

    setTimeout(() => {
      coins.forEach(c => c.classList.remove('tossing'));
      // 随机三枚铜钱结果
      const tosses = [Math.random()>0.5, Math.random()>0.5, Math.random()>0.5].map(h => h ? '🪙' : '🪨');
      const heads = tosses.filter(t => t === '🪙').length;
      let value, label, changing;
      if (heads === 3) { value = 9; label = '老阳 ⚊→⚋'; changing = true; }
      else if (heads === 2) { value = 7; label = '少阳 ⚊'; changing = false; }
      else if (heads === 1) { value = 8; label = '少阴 ⚋'; changing = false; }
      else { value = 6; label = '老阴 ⚋→⚊'; changing = true; }

      coins[0].textContent = tosses[0]; coins[1].textContent = tosses[1]; coins[2].textContent = tosses[2];

      zyLines.push({ value, changing });
      zyCastCount++;
      document.getElementById('zy-hint').textContent = label + ' — 第' + zyCastCount + '爻 (' + (6 - zyCastCount) + '次剩余)';

      // 渲染爻线（从下往上）
      const linesEl = document.getElementById('zy-lines');
      const row = document.createElement('div');
      row.className = 'zy-line-row';
      const sym = value === 7 || value === 9 ? '━━━' : '━  ━';
      row.innerHTML = `
        <span class="zy-line-num">${['初','二','三','四','五','上'][zyLines.length - 1]}</span>
        <span class="zy-line-symbol ${changing ? 'zy-line-changing' : ''}">${sym}</span>
        <span class="zy-line-label ${changing ? 'zy-line-changing' : ''}">${label}</span>
      `;
      linesEl.appendChild(row);

      if (zyCastCount >= 6) {
        document.getElementById('btn-cast').disabled = true;
        document.getElementById('zy-hint').textContent = '六爻已成，解读卦象...';
        setTimeout(showHexagramResult, 800);
      }
    }, 600);
  });

  function showHexagramResult() {
    const lowerTri = (zyLines[0].value%2===1?1:0) + (zyLines[1].value%2===1?2:0) + (zyLines[2].value%2===1?4:0);
    const upperTri = (zyLines[3].value%2===1?1:0) + (zyLines[4].value%2===1?2:0) + (zyLines[5].value%2===1?4:0);
    const lowerTriNew = zyLines.slice(0,3).reduce((a,l,i) => {
      const v = l.changing ? (l.value===9?8:7) : l.value;
      return a + (v%2===1 ? [1,2,4][i] : 0);
    }, 0);
    const upperTriNew = zyLines.slice(3,6).reduce((a,l,i) => {
      const v = l.changing ? (l.value===9?8:7) : l.value;
      return a + (v%2===1 ? [1,2,4][i] : 0);
    }, 0);

    const orig = getHexagramData(lowerTri, upperTri);
    const hasChanging = zyLines.some(l => l.changing);
    const changed = hasChanging ? getHexagramData(lowerTriNew, upperTriNew) : null;

    document.getElementById('zy-cast').style.display = 'none';

    const hexEl = document.getElementById('zy-hexagrams');
    const syms = zyLines.map(l => l.value%2===1 ? '━━━' : '━  ━').reverse().join('<br>');
    hexEl.innerHTML = `
      <div class="zy-hex">
        <div class="zy-hex-label">本卦</div>
        <div class="zy-hex-lines">${syms}</div>
        <div class="zy-hex-name">${orig.name}卦 ${TRIGRAMS[lowerTri]}上${TRIGRAMS[upperTri]}下</div>
      </div>
      ${changed ? `
      <div class="zy-hex">
        <div class="zy-hex-label">之卦</div>
        <div class="zy-hex-lines">${zyLines.map(l => l.changing ? (l.value===9?'━  ━':'━━━') : (l.value%2===1?'━━━':'━  ━')).reverse().join('<br>')}</div>
        <div class="zy-hex-name">${changed.name}卦</div>
      </div>` : ''}
    `;

    document.getElementById('zy-reading').innerHTML = `
      <h3>${orig.name}卦 · 卦辞</h3>
      <p>${orig.judge}</p>
      <p>${orig.desc}</p>
      ${changed ? `<h3 style="margin-top:1rem;">之卦 · ${changed.name}卦</h3><p>${changed.judge}</p><p>${changed.desc}</p>` : ''}
      ${hasChanging ? '<p style="margin-top:1rem;color:#e0c878;">变爻提示：本卦中动爻已变，之卦为发展趋向。</p>' : '<p style="margin-top:1rem;color:var(--text-dim);">本卦无动爻，静卦。</p>'}
    `;

    document.getElementById('zhouyi-result').style.display = 'block';
  }

  document.getElementById('btn-recast').addEventListener('click', () => {
    zyCastCount = 0; zyLines = [];
    document.getElementById('zy-lines').innerHTML = '';
    document.getElementById('zy-hint').textContent = '默念心中所问，点击投掷六次';
    document.getElementById('btn-cast').disabled = false;
    document.getElementById('zy-cast').style.display = 'block';
    document.getElementById('zhouyi-result').style.display = 'none';
  });

});
