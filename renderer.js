let allPets = [];
let displayedPets = [];

const petGrid = document.getElementById('petGrid');
const searchInput = document.getElementById('searchInput');
const sortBy = document.getElementById('sortBy');
const filterCategory = document.getElementById('filterCategory');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('emptyState');

const minGrowth = document.getElementById('minGrowth');
const minGrowthVal = document.getElementById('minGrowthVal');
const attrEarth = document.getElementById('attrEarth');
const attrWater = document.getElementById('attrWater');
const attrFire = document.getElementById('attrFire');
const attrWind = document.getElementById('attrWind');
const attrEarthVal = document.getElementById('attrEarthVal');
const attrWaterVal = document.getElementById('attrWaterVal');
const attrFireVal = document.getElementById('attrFireVal');
const attrWindVal = document.getElementById('attrWindVal');

const minAtkG = document.getElementById('minAtkG');
const minDefG = document.getElementById('minDefG');
const minAgiG = document.getElementById('minAgiG');
const minHpG = document.getElementById('minHpG');
const minAtkGVal = document.getElementById('minAtkGVal');
const minDefGVal = document.getElementById('minDefGVal');
const minAgiGVal = document.getElementById('minAgiGVal');
const minHpGVal = document.getElementById('minHpGVal');

/**
 * Initialize the application
 */
async function init() {
    try {
        allPets = await window.api.getPets();

        // Cache parsed stats for performance
        allPets.forEach(p => {
            p._parsedStats = {
                growth: parseFloat(p.stats['성장률'] || 0),
                atkG: getNumericValue(p.stats['공격력']),
                defG: getNumericValue(p.stats['방어력']),
                agiG: getNumericValue(p.stats['순발력']),
                hpG: getNumericValue(p.stats['내구력']),
                attr: parseAttributes(p.stats['속성'])
            };
        });

        displayedPets = [...allPets];

        // Populate category filter
        const categories = [...new Set(allPets.map(p => p.category))].sort();
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            filterCategory.appendChild(opt);
        });

        loader.style.display = 'none';
        update();
    } catch (err) {
        console.error('Failed to load pets:', err);
        loader.textContent = '데이터를 불러오는 중 오류가 발생했습니다.';
    }
}

/**
 * Parse attribute string (e.g., "화7풍3") into an object
 */
function parseAttributes(attrStr) {
    const res = { '지': 0, '수': 0, '화': 0, '풍': 0 };
    if (!attrStr) return res;

    const matches = attrStr.match(/([지수화풍])(\d+)/g);
    if (matches) {
        matches.forEach(m => {
            const char = m[0];
            const val = parseInt(m.substring(1));
            res[char] = val;
        });
    }
    return res;
}

/**
 * Render the pet grid based on displayedPets
 */
function render() {
    petGrid.innerHTML = '';

    if (displayedPets.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    // Show first 100 for performance
    const toRender = displayedPets.slice(0, 100);

    toRender.forEach((pet, index) => {
        const card = document.createElement('div');
        card.className = 'pet-card';
        card.style.animationDelay = `${index * 0.05}s`;

        const imgSrc = pet.local_image ? `./images/${pet.local_image}` : './images/default.jpg';
        const attack = pet.stats['공격력'] || '-';
        const defense = pet.stats['방어력'] || '-';
        const agility = pet.stats['순발력'] || '-';
        const hp = pet.stats['내구력'] || '-';
        const growth = pet.stats['성장률'] || '0.0';
        const attrParsed = pet._parsedStats.attr;

        // Recommendation Logic (Dynamically generated risk analysis based on fractions)
        const getInitRecommendation = () => {
            if (!pet.init_stats_decimal) return null; // Only show if data is explicitly known

            try {
                const decs = pet.init_stats_decimal;
                // Arrays matching order [H, A, D, S]
                const F = [decs.hp, decs.atk, decs.def, decs.agi];
                const D = F.map(f => f % 1);

                const names = ['체력', '공격', '방어', '순발'];

                // 마이너스(-1) 타협 위험도 판별 (가장 핵심!)
                const sortedIndices = [0,1,2,3].sort((i, j) => D[i] - D[j]); // 소수점 낮은(안전한) 순
                
                const riskHtml = sortedIndices.map(i => { 
                    const d = D[i];
                    let label = '';
                    let color = '';
                    if (d <= 0.20) {
                        label = '[매우 안전] 1 낮아도 내부손실 미미함';
                        color = '#34d399'; // Green
                    } else if (d <= 0.45) {
                        label = '[타협 가능] 다른 스탯으로 커버 가능';
                        color = '#94a3b8'; // Slate
                    } else if (d <= 0.75) {
                        label = '[도박급] 정석대비 베이스 탈락 유력';
                        color = '#fbbf24'; // Yellow
                    } else {
                        label = '[절대 불가] 1 하락 = 베이스 완전 파괴';
                        color = '#ef4444'; // Red
                    }
                    return `<tr><td style="font-weight:700; color:#cbd5e1;">${names[i]} (-1)</td><td style="text-align:right; font-size:0.7rem; color:${color}; font-weight:700;">${label}</td></tr>`;
                }).join('');

                return { decs, riskHtml };
            } catch (e) { return null; }
        };

        const rec = getInitRecommendation();

        // Build popover HTML
        let popoverHtml = '';
        if (rec) {
            popoverHtml = `
                <div class="stat-popover" style="width: 320px;">
                    <div class="popover-title" style="margin-bottom:0; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                        정석 기준점 : 체${rec.decs.hp.toFixed(2)} 공${rec.decs.atk.toFixed(2)} 방${rec.decs.def.toFixed(2)} 순${rec.decs.agi.toFixed(2)}
                    </div>
                    
                    <div class="popover-section-title" style="margin-top:10px;">▶ 마이너스(-1) 타협 가이드</div>
                    <table class="popover-table" style="width:100%; border-spacing: 0 4px; border-collapse: separate;">
                        ${rec.riskHtml}
                    </table>
                </div>
            `;
        }

        // Generate attribute bar
        let barHtml = '';
        const attrOrder = [
            { key: '지', class: 'earth', label: '지' },
            { key: '수', class: 'water', label: '수' },
            { key: '화', class: 'fire', label: '화' },
            { key: '풍', class: 'wind', label: '풍' }
        ];

        attrOrder.forEach(a => {
            const count = attrParsed[a.key];
            for (let i = 0; i < count; i++) {
                barHtml += `<div class="attr-segment ${a.class}"></div>`;
            }
        });

        const labelHtml = attrOrder
            .filter(a => attrParsed[a.key] > 0)
            .map(a => `<div class="attr-label-item"><span class="dot ${a.class}"></span>${a.label}: ${attrParsed[a.key]}</div>`)
            .join('');

        card.innerHTML = `
            ${popoverHtml}
            <div class="pet-header-centered">
                <div class="thumb-container">
                    <img class="pet-thumb-large" src="${imgSrc}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/120/1e293b/f1f5f9?text=${encodeURIComponent(pet.name)}'">
                </div>
                <div class="pet-info-centered">
                    <div class="name-large">${pet.name}</div>
                    <span class="category-tag">${pet.category}</span>
                </div>
            </div>
            <div class="stats-grid-compact">
                <div class="stat-row">
                    <div class="stat-cell">
                        <span class="label">공격</span>
                        <span class="value">${attack}</span>
                    </div>
                    <div class="stat-cell">
                        <span class="label">방어</span>
                        <span class="value">${defense}</span>
                    </div>
                </div>
                <div class="stat-row">
                    <div class="stat-cell">
                        <span class="label">순발</span>
                        <span class="value">${agility}</span>
                    </div>
                    <div class="stat-cell">
                        <span class="label">내구</span>
                        <span class="value">${hp}</span>
                    </div>
                </div>
                <div class="growth-box-full">성장률: ${growth}</div>
            </div>
            <div class="attr-bar-container">
                <div class="attr-bar">
                    ${barHtml}
                </div>
                <div class="attr-label-row">
                    ${labelHtml}
                </div>
            </div>
        `;
        petGrid.appendChild(card);
    });

    if (displayedPets.length > 100) {
        const more = document.createElement('div');
        more.style.gridColumn = '1 / -1';
        more.style.textAlign = 'center';
        more.style.padding = '20px';
        more.style.color = 'var(--text-secondary)';
        more.textContent = `... 그 외 ${displayedPets.length - 100}마리가 더 있습니다.`;
        petGrid.appendChild(more);
    }
}

/**
 * Determine dynamic color based on attribute
 */
function getAttributeColor(attr) {
    if (!attr) return '#94a3b8';
    if (attr.includes('화')) return '#f87171';
    if (attr.includes('수')) return '#60a5fa';
    if (attr.includes('지')) return '#fbbf24';
    if (attr.includes('풍')) return '#34d399';
    return '#94a3b8';
}

/**
 * Helper to get numeric value from stat strings like "10(2.164)"
 */
function getNumericValue(valStr) {
    if (!valStr) return 0;
    const match = valStr.match(/\((\d+(\.\d+)?)\)/);
    if (match) return parseFloat(match[1]);
    const plainMatch = valStr.match(/\d+(\.\d+)?/);
    return plainMatch ? parseFloat(plainMatch[0]) : 0;
}

/**
 * Filter and search logic
 */
function update() {
    const term = searchInput.value.toLowerCase();
    const cat = filterCategory.value;
    const sort = sortBy.value;

    const minG = parseFloat(minGrowth.value);
    const minE = parseInt(attrEarth.value);
    const minW = parseInt(attrWater.value);
    const minF = parseInt(attrFire.value);
    const minWi = parseInt(attrWind.value);

    const minAG = parseFloat(minAtkG.value);
    const minDG = parseFloat(minDefG.value);
    const minSgiG = parseFloat(minAgiG.value);
    const minHG = parseFloat(minHpG.value);

    minGrowthVal.textContent = minG.toFixed(1);
    attrEarthVal.textContent = minE;
    attrWaterVal.textContent = minW;
    attrFireVal.textContent = minF;
    attrWindVal.textContent = minWi;

    minAtkGVal.textContent = minAG.toFixed(2);
    minDefGVal.textContent = minDG.toFixed(2);
    minAgiGVal.textContent = minSgiG.toFixed(2);
    minHpGVal.textContent = minHG.toFixed(1);

    displayedPets = allPets.filter(p => {
        const stats = p._parsedStats;
        const matchSearch = p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
        const matchCat = cat === 'all' || p.category === cat;
        const matchGrowth = stats.growth >= minG;
        const matchAttr =
            stats.attr['지'] >= minE &&
            stats.attr['수'] >= minW &&
            stats.attr['화'] >= minF &&
            stats.attr['풍'] >= minWi;
        const matchStatGrowth =
            stats.atkG >= minAG &&
            stats.defG >= minDG &&
            stats.agiG >= minSgiG &&
            stats.hpG >= minHG;

        return matchSearch && matchCat && matchGrowth && matchAttr && matchStatGrowth;
    });

    displayedPets.sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        const key = sort === 'growth' ? 'growth' : (sort === 'attack' ? 'atkG' : (sort === 'hp' ? 'hpG' : 'growth'));
        return b._parsedStats[key] - a._parsedStats[key];
    });

    render();
}

// Event Listeners for Filter Toggle
const filterToggle = document.getElementById('filterToggle');
const mainHeader = document.getElementById('mainHeader');

if (filterToggle && mainHeader) {
    filterToggle.addEventListener('click', () => {
        mainHeader.classList.toggle('header-collapsed');
    });
}

// Auto-collapse on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        if (!mainHeader.classList.contains('header-collapsed')) {
            mainHeader.classList.add('header-collapsed');
        }
    }
});

// Event Listeners for inputs
[searchInput, filterCategory, sortBy, minGrowth, attrEarth, attrWater, attrFire, attrWind, minAtkG, minDefG, minAgiG, minHpG].forEach(el => {
    if (el) el.addEventListener('input', update);
});

// Start
init();
