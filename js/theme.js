const DANH_SACH_GIAO_DIEN = {
    'ios18': 'Apple iOS 18',
    'ios26': 'Apple iOS 26 (Future)',
    'oneui': 'Samsung OneUI',
    'window11': 'Windows 11',
    'pixel': 'Google Pixel',
};

export const xayDungMenuGiaoDien = () => {
    const menu = $('#menu-giao-dien-chon');
    if (!menu.length) return;
    menu.empty();
    
    for (const ma in DANH_SACH_GIAO_DIEN) {
        const ten = DANH_SACH_GIAO_DIEN[ma];
        menu.append(`
            <div class="theme-option-group">
                <div class="theme-option-title">${ten}</div>
                <div class="d-flex px-3 gap-2 pb-2">
                    <button class="btn btn-xs btn-outline-primary flex-grow-1 py-1 px-2 small lua-chon-giao-dien" data-theme="${ma}" data-mode="light" style="font-size: 0.7rem;">Sáng</button>
                    <button class="btn btn-xs btn-outline-dark flex-grow-1 py-1 px-2 small lua-chon-giao-dien" data-theme="${ma}" data-mode="dark" style="font-size: 0.7rem;">Tối</button>
                </div>
            </div>
        `);
    }
};

export const apDungGiaoDien = (tenLopGiaoDien) => {
    const danhSachLop = $('body').attr('class')?.split(' ') || [];
    for (let lop of danhSachLop) {
        if (lop.startsWith('theme-')) {
            $('body').removeClass(lop);
        }
    }
    $('body').addClass(tenLopGiaoDien);
};

export const luuCauHinhGiaoDien = (luaChon) => {
    localStorage.setItem('cau_hinh_giao_dien', luaChon);
};

export const apDungGiaoDienNgauNhien = () => {
    const danhSachMa = Object.keys(DANH_SACH_GIAO_DIEN);
    const maNgauNhien = danhSachMa[Math.floor(Math.random() * danhSachMa.length)];
    const cheDoNgauNhien = Math.random() < 0.5 ? 'light' : 'dark';
    const lopGiaoDienNgauNhien = `theme-${maNgauNhien}-${cheDoNgauNhien}`;
    apDungGiaoDien(lopGiaoDienNgauNhien);
    luuCauHinhGiaoDien(lopGiaoDienNgauNhien);
};

export const khoiTaoGiaoDien = () => {
    const cauHinhCu = localStorage.getItem('cau_hinh_giao_dien') || 'theme-ios18-light';
    if (cauHinhCu === 'random') {
        apDungGiaoDienNgauNhien();
    } else {
        apDungGiaoDien(cauHinhCu);
    }
};