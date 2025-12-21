export const hienThiThongBao = (noiDung, loai = 'success') => {
    let mauNen = "linear-gradient(to right, #00b09b, #96c93d)"; // Xanh lá - Thành công
    if (loai === 'danger' || loai === 'error') {
        mauNen = "linear-gradient(to right, #ff5f6d, #ffc371)"; // Đỏ - Lỗi
    } else if (loai === 'info') {
        mauNen = "linear-gradient(to right, #2193b0, #6dd5ed)"; // Xanh dương - Thông tin
    }

    if (window.Toastify) {
        window.Toastify({
            text: noiDung,
            duration: 3000,
            gravity: "bottom",
            position: "right",
            stopOnFocus: true,
            style: {
                background: mauNen,
                borderRadius: "12px",
                boxShadow: "0 5px 15px rgba(0,0,0,0.15)",
                fontFamily: "'Poppins', sans-serif",
                padding: "12px 20px",
                fontWeight: "500",
                fontSize: "0.9rem"
            }
        }).showToast();
    } else {
        console.log(`[${loai}] ${noiDung}`);
    }
};

export const hienThiTaiTrang = (chuThich = "Đang xử lý...") => {
    $('#chu-thich-tai-trang').text(chuThich);
    $('#lop-phu-tai-trang').css('display', 'flex');
};

export const anTaiTrang = () => {
    $('#lop-phu-tai-trang').hide();
};

export const dinhDangNgayHienThi = (ngay) => {
     const n = new Date(ngay);
     const d = String(n.getDate()).padStart(2, '0');
     const m = String(n.getMonth() + 1).padStart(2, '0');
     const y = n.getFullYear();
     return `${d}/${m}/${y}`;
};

export const dinhDangNgayISO = (ngay) => {
    const n = new Date(ngay);
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const trichXuatSoLieu = (noiDung, tuKhoa) => {
    if (!noiDung) return 0;
    const danhSachTuKhoa = Array.isArray(tuKhoa) ? tuKhoa : [tuKhoa];
    for (const tu of danhSachTuKhoa) {
        const tuDaEscape = tu.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const bieuThuc = new RegExp(tuDaEscape + '\\s*[: ]\\s*(\\d+)', 'i');
        const khop = noiDung.match(bieuThuc);
        if (khop) return parseInt(khop[1], 10);
    }
    return 0;
};