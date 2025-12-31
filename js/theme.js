
const DANH_SACH_GIAO_DIEN = {
    'ios18': 'iOS 18',
    'oneui': 'OneUI',
    'window11': 'Window 11',
    'pastel': 'Pastel Dream',
    'nature': 'Serene Nature',
    'gaming': 'Gaming Zone',
    'carbon': 'Carbon Fiber',
    'chic': 'Chic & Modern',
};

export const xayDungMenuGiaoDien = () => {
    const menu = $('#menu-giao-dien-chon');
    if (!menu.length) return;
    menu.empty();
    for (const ma in DANH_SACH_GIAO_DIEN) {
        const ten = DANH_SACH_GIAO_DIEN[ma];
        menu.append(`
            <li class="dropdown-submenu">
                <a class="dropdown-item dropdown-toggle" href="javascript:void(0)">${ten}</a>
                <ul class="dropdown-menu shadow border-0">
                    <li><a class="dropdown-item lua-chon-giao-dien" href="#" data-theme="${ma}" data-mode="light">Chế độ Sáng</a></li>
                    <li><a class="dropdown-item lua-chon-giao-dien" href="#" data-theme="${ma}" data-mode="dark">Chế độ Tối</a></li>
                </ul>
            </li>
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
};

export const khoiTaoGiaoDien = () => {
    const cauHinhCu = localStorage.getItem('cau_hinh_giao_dien') || 'theme-ios18-light';
    if (cauHinhCu === 'random') {
        apDungGiaoDienNgauNhien();
    } else {
        apDungGiaoDien(cauHinhCu);
    }
};
