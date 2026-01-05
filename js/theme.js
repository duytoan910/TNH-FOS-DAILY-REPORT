
const THEMES = [
    { name: 'iOS 18', id: 'ios18' },
    { name: 'OneUI', id: 'oneui' },
    { name: 'Window 11', id: 'window11' },
    { name: 'Pastel', id: 'pastel' },
    { name: 'Nature', id: 'nature' },
    { name: 'Carbon', id: 'carbon' },
    { name: 'Gaming', id: 'gaming' },
    { name: 'Chic', id: 'chic' }
];

export const khoiTaoGiaoDien = () => {
    let saved = localStorage.getItem('theme_preference');
    if (saved === 'random') {
        apDungGiaoDienNgauNhien();
    } else if (saved) {
        apDungGiaoDien(saved);
    } else {
        apDungGiaoDien('theme-ios18-light');
    }
};

export const xayDungMenuGiaoDien = () => {
    const $menu = $('#menu-giao-dien-chon');
    if (!$menu.length) return;
    
    let html = '';
    THEMES.forEach(t => {
        html += `
            <li class="px-3 py-1">
                <span class="fw-bold small text-uppercase opacity-50" style="font-size: 0.65rem;">${t.name}</span>
                <div class="d-flex gap-2 mt-1">
                    <button class="btn btn-sm btn-outline-primary lua-chon-giao-dien flex-grow-1 py-1" data-theme="${t.id}" data-mode="light">Sáng</button>
                    <button class="btn btn-sm btn-outline-dark lua-chon-giao-dien flex-grow-1 py-1" data-theme="${t.id}" data-mode="dark">Tối</button>
                </div>
            </li>
        `;
    });
    $menu.html(html);
};

export const apDungGiaoDien = (className) => {
    $('body').attr('class', 'py-4 ' + className);
};

export const luuCauHinhGiaoDien = (className) => {
    localStorage.setItem('theme_preference', className);
};

export const apDungGiaoDienNgauNhien = () => {
    const t = THEMES[Math.floor(Math.random() * THEMES.length)];
    const m = Math.random() > 0.5 ? 'light' : 'dark';
    apDungGiaoDien(`theme-${t.id}-${m}`);
};
