class Card {
    constructor({
        imageUrl,
        title = '',
        description = '',
        onDismiss,
    }) {
        this.imageUrl = imageUrl;
        this.title = title;
        this.description = description;
        this.onDismiss = onDismiss;
        this.init();
    }

    // private properties
    startPoint;
    offsetX;
    offsetY;

    //private methods

    init = () => {
        const card = document.createElement('div');
        card.classList.add('card');
        // ポラロイド枠：上に写真エリア、下に白地のキャプション
        const polaroid = document.createElement('div');
        polaroid.classList.add('card-polaroid');
        const photo = document.createElement('div');
        photo.classList.add('card-photo');
        const img = document.createElement('img');
        img.src = this.imageUrl;
        photo.append(img);
        if (window.CARD_FACILITY_NAME) {
            const facilityEl = document.createElement('div');
            facilityEl.className = 'card-facility-name';
            facilityEl.textContent = window.CARD_FACILITY_NAME;
            photo.append(facilityEl);
        }
        polaroid.append(photo);
        const caption = document.createElement('div');
        caption.classList.add('card-caption');
        if (this.title) {
            const titleEl = document.createElement('div');
            titleEl.className = 'card-title';
            titleEl.textContent = this.title;
            caption.append(titleEl);
        }
        if (this.description) {
            const descEl = document.createElement('div');
            descEl.className = 'card-description';
            descEl.textContent = this.description;
            caption.append(descEl);
        }
        polaroid.append(caption);
        card.append(polaroid);
        this.element = card;
        this.listenToMouseEvents();
        this.listenToTouchEvents();
    }

    /** ドラッグ時も同じ見た目を保つため、休止時の translateZ(px) を CSS 変数から取得 */
    getRestZ = () => {
        const s = getComputedStyle(this.element);
        const i = parseFloat(s.getPropertyValue('--i')) || 0;
        const z = (s.getPropertyValue('--stack-z') || '30px').trim();
        const zNum = parseFloat(z) || 30;
        return i * zNum;
    };

    listenToMouseEvents = () => {
        this.element.addEventListener('mousedown', e => {
            const { clientX, clientY } = e;
            this.startPoint = { x: clientX, y: clientY };
            this.element.style.transition = '';
            document.addEventListener('mousemove', this.handleMouseMove);
        });
        document.addEventListener('mouseup', this.handleMouseUp);
        this.element.addEventListener('dragstart', e => { e.preventDefault(); });
    }

    // タッチデバイス用：スワイプでカード操作（スワイプ中はページスクロールを抑止）
    listenToTouchEvents = () => {
        this.element.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) return;
            const { clientX, clientY } = e.touches[0];
            this.startPoint = { x: clientX, y: clientY };
            this.element.style.transition = '';
            document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
            document.addEventListener('touchend', this.handleTouchEnd);
            document.addEventListener('touchcancel', this.handleTouchEnd);
        }, { passive: true });
    };
    handleTouchMove = (e) => {
        if (!this.startPoint || e.touches.length !== 1) return;
        e.preventDefault(); // スワイプ中はページスクロールさせない
        const { clientX, clientY } = e.touches[0];
        this.offsetX = clientX - this.startPoint.x;
        this.offsetY = clientY - this.startPoint.y;
        const rotate = this.offsetX * 0.1;
        const z = this.getRestZ();
        this.element.style.transform = `translateZ(${z}px) translate(${this.offsetX}px, ${this.offsetY}px) rotate(${rotate}deg)`;
        if (Math.abs(this.offsetX) > this.element.clientWidth * 0.7) {
            const direction = this.offsetX > 0 ? 1 : -1;
            this.dismiss(direction);
        }
    };
    handleTouchEnd = () => {
        this.startPoint = null;
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchcancel', this.handleTouchEnd);
        this.element.style.transition = 'transform 0.5s';
        this.element.style.transform = '';
    };
    handleMouseMove = (e) => {
        if (!this.startPoint) return;
        const { clientX, clientY } = e;
        this.offsetX = clientX - this.startPoint.x;
        this.offsetY = clientY - this.startPoint.y;
        const rotate = this.offsetX * 0.1;
        const z = this.getRestZ();
        this.element.style.transform = `translateZ(${z}px) translate(${this.offsetX}px, ${this.offsetY}px) rotate(${rotate}deg)`;
        if (Math.abs(this.offsetX) > this.element.clientWidth * 0.7) {
            const direction = this.offsetX > 0 ? 1 : -1;
            this.dismiss(direction);
        }
    }
    handleMouseUp = () => {
        this.startPoint = null;
        document.removeEventListener('mousemove', this.handleMouseMove);
        this.element.style.transition = 'transform 0.5s';
        this.element.style.transform = '';
    }
    dismiss = (direction) => {
        this.startPoint = null;
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchcancel', this.handleTouchEnd);
        this.element.style.transition = 'transform 1s';
        const z = this.getRestZ();
        this.element.style.transform = `translateZ(${z}px) translate(${direction * window.innerWidth}px, ${this.offsetY}px) rotate(${90 * direction}deg)`;
        this.element.classList.add('dismissing');

        setTimeout(() => {
            this.element.remove();
            // 残りカードの --i を 0 から振り直し、常に手前が全面で当たるようにする
            updateCardIndices();
        }, 1000);
        if (typeof this.onDismiss === 'function') {
            this.onDismiss();
        }
    }
}


// Dom
const swiper = document.querySelector('#swiper');

// constants（window.CARD_DATA が無いときのフォールバック）
const defaultUrls = [
    'https://picsum.photos/1000/1000?random=1',
    'https://picsum.photos/1000/1000?random=2',
    'https://picsum.photos/1000/1000?random=3',
    'https://picsum.photos/1000/1000?random=4',
    'https://picsum.photos/1000/1000?random=5',
    'https://picsum.photos/1000/1000?random=6',
    'https://picsum.photos/1000/1000?random=7',
    'https://picsum.photos/1000/1000?random=8',
    'https://picsum.photos/1000/1000?random=9',
    'https://picsum.photos/1000/1000?random=10',
];

// JSON（pict.json）またはデフォルト：要素は文字列または { imageUrl, title?, description? }
const cardItems = (window.CARD_DATA && Array.isArray(window.CARD_DATA) && window.CARD_DATA.length) ?
    window.CARD_DATA :
    defaultUrls.map(url => ({ imageUrl: url, title: '', description: '' }));

// variables
let cardCount = 0;

// functions
/** --i が大きいほど手前に描画。先頭のカードを手前にし、その1枚だけ操作可能（.card-front） */
function updateCardIndices() {
    const cards = swiper.querySelectorAll('.card');
    const len = cards.length;
    const maxI = len - 1;
    swiper.style.setProperty('--max-i', maxI);
    cards.forEach((el, index) => {
        el.style.setProperty('--i', maxI - index);
        el.classList.toggle('card-front', index === 0);
    });
}

function appendNewCard() {
    if (cardItems.length === 0) return;
    const item = cardItems[cardCount % cardItems.length];
    const imageUrl = typeof item === 'string' ? item : item.imageUrl;
    const title = typeof item === 'object' && item ? (item.title || '') : '';
    const description = typeof item === 'object' && item ? (item.description || '') : '';
    const card = new Card({
        imageUrl,
        title,
        description,
        onDismiss: appendNewCard,
    });
    swiper.append(card.element);
    cardCount++;
    const cards = swiper.querySelectorAll('.card:not(.dismissing)');
    const len = cards.length;
    const maxI = len - 1;
    swiper.style.setProperty('--max-i', maxI);
    cards.forEach((el, index) => {
        el.style.setProperty('--i', maxI - index);
        el.classList.toggle('card-front', index === 0);
    });
}

// 初期表示枚数（cardItems の長さを超えない）
const initialCount = Math.min(5, cardItems.length);
for (let i = 0; i < initialCount; i++) {
    appendNewCard();
}