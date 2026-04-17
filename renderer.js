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

    // Show first 100 for performance (can implement infinite scroll later)
    const toRender = displayedPets.slice(0, 100);

    toRender.forEach((pet, index) => {
        const card = document.createElement('div');
        card.className = 'pet-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        const imgSrc = pet.local_image ? `./images/${pet.local_image}` : './images/default.jpg';
        
        // Extract base value and bonus for pretty display if needed
        // Format: 10(2.164)
        const attack = pet.stats['공격력'] || '-';
        const defense = pet.stats['방어력'] || '-';
        const agility = pet.stats['순발력'] || '-';
        const hp = pet.stats['내구력'] || '-';
        const growth = pet.stats['성장률'] || '0.0';
        const attr = pet.stats['속성'] || '무소속';

        card.innerHTML = `
            <div class="pet-header">
                <img class="pet-thumb" src="${imgSrc}" loading="lazy" onerror="this.onerror=null;this.src='https://via.placeholder.com/80/1e293b/f1f5f9?text=${encodeURIComponent(pet.name)}'">
                <div class="pet-title">
                    <div class="name">${pet.name}</div>
                    <span class="category">${pet.category}</span>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">공격</span>
                    <span class="stat-value">${attack}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">방어</span>
                    <span class="stat-value">${defense}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">순발</span>
                    <span class="stat-value">${agility}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">내구</span>
                    <span class="stat-value">${hp}</span>
                </div>
                <div class="growth-box">성장률: ${growth}</div>
            </div>
            <div class="attribute-tag" style="color: ${getAttributeColor(attr)}; border-color: ${getAttributeColor(attr)}22; background: ${getAttributeColor(attr)}11">
                ${attr}
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
    if (attr.includes('화')) return '#f87171'; // Red
    if (attr.includes('수')) return '#60a5fa'; // Blue
    if (attr.includes('지')) return '#fbbf24'; // Yellow/Earth
    if (attr.includes('풍')) return '#34d399'; // Green/Wind
    return '#94a3b8';
}

/**
 * Helper to get numeric value from stat strings like "10(2.164)"
 */
function getNumericValue(valStr) {
    if (!valStr) return 0;
    // Try to get growth rate in parens first, if not just get the first float
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
    
    // Range values
    const minG = parseFloat(minGrowth.value);
    const minE = parseInt(attrEarth.value);
    const minW = parseInt(attrWater.value);
    const minF = parseInt(attrFire.value);
    const minWi = parseInt(attrWind.value);

    // Stat Growth Range values
    const minAG = parseFloat(minAtkG.value);
    const minDG = parseFloat(minDefG.value);
    const minSgiG = parseFloat(minAgiG.value); 
    const minHG = parseFloat(minHpG.value);

    // Update UI labels
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
        
        // Filters
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
        const valA = a._parsedStats[key];
        const valB = b._parsedStats[key];
        
        return valB - valA; 
    });

    render();
}

// Event Listeners
[searchInput, filterCategory, sortBy, minGrowth, attrEarth, attrWater, attrFire, attrWind, minAtkG, minDefG, minAgiG, minHpG].forEach(el => {
    el.addEventListener('input', update);
});

// Start
init();
