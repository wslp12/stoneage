const { execSync } = require('child_process');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://diseno.live';
const COOKIE = 'PHPSESSID=mre94i737388fq0ddcgj9sd10f; rx_uatype=uHVD7LwLphDZ8G-fLEMqRg%3A0';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const IMG_DIR = path.join(__dirname, 'images');
if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR);
}

function fetchWithCurl(url) {
    try {
        // Use curl.exe directly as it showed success in testing
        const command = `curl.exe -s -L -A "${USER_AGENT}" -b "${COOKIE}" "${url}"`;
        const output = execSync(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
        return output;
    } catch (error) {
        console.error(`Curl fetch failed for ${url}:`, error.message);
        return null;
    }
}

function downloadImageWithCurl(url, filename) {
    const filePath = path.join(IMG_DIR, filename);
    if (fs.existsSync(filePath)) return filename;

    try {
        const fullUrl = url.startsWith('http') ? url : BASE_URL + url;
        // Escape quotes in URL if necessary, but here we assume safe
        const command = `curl.exe -s -L -A "${USER_AGENT}" -b "${COOKIE}" "${fullUrl}" -o "${filePath}"`;
        execSync(command);
        return filename;
    } catch (error) {
        console.error(`Image download failed for ${url}:`, error.message);
        return null;
    }
}

async function parsePage(pageNumber) {
    const url = `${BASE_URL}/pet?page=${pageNumber}`;
    console.log(`Parsing ${url}...`);

    const data = fetchWithCurl(url);
    if (!data) return null;

    if (data.includes('요청한 기능을 실행할 수 있는 권한이 없습니다')) {
        console.error('Permission denied. Cookie might be invalid or expired.');
        return null;
    }

    const $ = cheerio.load(data);
    const pets = [];

    const items = $('.has_thumb');
    console.log(`Found ${items.length} items on page ${pageNumber}`);
    
    if (items.length === 0) return null;

    for (let i = 0; i < items.length; i++) {
        const el = items[i];
        const $el = $(el);

        const thumbA = $el.find('.list_thumb');
        const detailPath = thumbA.attr('href');
        const idMatch = detailPath ? detailPath.match(/\/pet\/(\d+)/) : null;
        const id = idMatch ? idMatch[1] : `unknown_${Date.now()}_${i}`;
        
        const imgEl = thumbA.find('img');
        const imgSrc = imgEl.attr('src');
        const petName = $el.find('.list_title .title').text().trim() || imgEl.attr('alt');
        
        const category = $el.find('.list_ctg').text().trim();
        
        // Stats
        const stats = {};
        $el.find('.list_info ul li').each((_, li) => {
            const text = $(li).text();
            const splitIdx = text.indexOf(':');
            if (splitIdx !== -1) {
                const key = text.substring(0, splitIdx).trim();
                const val = text.substring(splitIdx + 1).trim();
                stats[key] = val;
            }
        });

        // Download image
        let localImg = null;
        if (imgSrc) {
            // Extract extension from src
            const extMatch = imgSrc.match(/\.(\w+)(\?|$)/);
            const ext = extMatch ? extMatch[1] : 'jpg';
            const filename = `${id}.${ext}`;
            localImg = downloadImageWithCurl(imgSrc, filename);
        }

        pets.push({
            id,
            name: petName,
            category,
            stats,
            image_url: imgSrc ? (imgSrc.startsWith('http') ? imgSrc : BASE_URL + imgSrc) : null,
            local_image: localImg,
            detail_url: detailPath ? (detailPath.startsWith('http') ? detailPath : BASE_URL + detailPath) : null
        });
    }

    return pets;
}

async function main() {
    let allPets = [];
    let page = 1;
    const maxPages = 50; // High limit, will break if no more pets

    while (page <= maxPages) {
        const pets = await parsePage(page);
        if (!pets || pets.length === 0) {
            console.log(`No more pets found or error occurred on page ${page}. finishing...`);
            break;
        }
        allPets = allPets.concat(pets);
        console.log(`Current total pets: ${allPets.length}`);
        
        page++;
        // Small delay
        await new Promise(r => setTimeout(r, 300));
    }

    if (allPets.length > 0) {
        fs.writeFileSync('pets.json', JSON.stringify(allPets, null, 2), 'utf8');
        console.log(`\nSuccess! Saved ${allPets.length} pets to pets.json`);
        console.log(`Images are in the 'images' folder.`);
    } else {
        console.log('\nNo pets were scraped. Please check the cookie or site access.');
    }
}

main();
