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
        const img = document.createElement('img');
        img.src = this.imageUrl;
        card.append(img);
        if (this.title) {
            const titleEl = document.createElement('div');
            titleEl.className = 'card-title';
            titleEl.textContent = this.title;
            card.append(titleEl);
        }
        if (this.description) {
            const descEl = document.createElement('div');
            descEl.className = 'card-description';
            descEl.textContent = this.description;
            card.append(descEl);
        }
        this.element = card;
        this.listenToMouseEvents();
    }


    listenToMouseEvents = () => {
        // mouse down
        this.element.addEventListener('mousedown', e => {
            const { clientX, clientY } = e;
            this.startPoint = { x: clientX, y: clientY };
            // no transiton when moving
            this.element.style.transition = '';
            document.addEventListener('mousemove', this.handleMouseMove);
        });
        // mouse up
        document.addEventListener('mouseup', this.handleMouseUp);

        // prevent drag
        this.element.addEventListener('dragstart', e => { e.preventDefault() });
    }
    handleMouseMove = (e) => {
        if (!this.startPoint) return;
        const { clientX, clientY } = e;
        this.offsetX = clientX - this.startPoint.x;
        this.offsetY = clientY - this.startPoint.y;

        const rotate = this.offsetX * 0.1;
        this.element.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) rotate(${rotate}deg)`;

        // dismiss card when moving too far way
        if (Math.abs(this.offsetX) > this.element.clientWidth * 0.7) {
            const direction = this.offsetX > 0 ? 1 : -1;
            this.dismiss(direction);
        }
    }
    handleMouseUp = (e) => {
        this.startPoint = null;
        document.removeEventListener('mousemove', this.handleMouseMove);

        // transiton when move back
        this.element.style.transition = 'transform 0.5s';
        this.element.style.transform = '';
    }
    dismiss = (direction) => {
        this.startPoint = null;
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        this.element.style.transition = 'transform 1s';
        this.element.style.transform = `translate(${direction * window.innerWidth}px, ${this.offsetY}px) rotate(${90 * direction}deg)`;
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
const cardItems = (window.CARD_DATA && Array.isArray(window.CARD_DATA) && window.CARD_DATA.length)
    ? window.CARD_DATA
    : defaultUrls.map(url => ({ imageUrl: url, title: '', description: '' }));

// variables
let cardCount = 0;

// functions
/** 残りカードの --i を 0 から振り直す（手前＝first-child が常に全面でマウス当たりになる） */
function updateCardIndices() {
    const cards = swiper.querySelectorAll('.card');
    cards.forEach((el, index) => {
        el.style.setProperty('--i', index);
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
    cards.forEach((el, index) => {
        el.style.setProperty('--i', index);
    });
}

// 初期表示枚数（cardItems の長さを超えない）
const initialCount = Math.min(5, cardItems.length);
for (let i = 0; i < initialCount; i++) {
    appendNewCard();
}