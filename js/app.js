
import { KHOA_BO_NHO_TAM_CUC_BO } from './config.js';
import { hienThiThongBao, hienThiTaiTrang, anTaiTrang, dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu } from './utils.js';
import { khoiTaoGiaoDien, xayDungMenuGiaoDien } from './theme.js';
import { thucHienGoiApi, ghiNhanTuongTacApi, lamMoiThongKeCsdl, datCheDoUngDung, layCheDoUngDung } from './api.js';
import { kiemTraTenTrongBaoCao, taoCauTrucGuiBaoCao } from './report.js';
import { initUIHandlers } from './ui.js';

// --- TRẠNG THÁI TOÀN CỤC ---
export const state = {
    danhSachNhanVien: [],
    baoCaoLichSuGanNhat: null,
    nhanVienHienTai: null,
    nhanVienCanXoa: null
};

// --- CÁC HÀM CỐT LÕI ---
export const capNhatWidgetDb = (trucTuyen, slNv, slBaoCao, slTruyCap) => {
    const $cham = $('#cham-trang-thai-db');
    const $chu = $('#chu-trang-thai-db');
    if (trucTuyen) {
        $cham.removeClass('offline').addClass('online');
        $chu.text('RestDB Online');
    } else {
        $cham.removeClass('online').addClass('offline');
        $chu.text('Offline Mode');
    }
    if (slNv !== null) $('#so-luong-nv-db').text(`NV: ${slNv}`);
    if (slBaoCao !== null) $('#so-luong-bao-cao-db').text(`Rpt: ${slBaoCao}`);
    if (slTruyCap !== null) $('#luong-truy-cap-api').text(`(${slTruyCap})`);
};

export const hienThiDanhSachNhanVien = () => {
    const $vungDsNv = $('#vung-danh-sach-nv');
    if (state.danhSachNhanVien.length === 0) {
        $vungDsNv.html('<div class="text-center py-3 text-muted">Danh sách trống.</div>');
        return;
    }
    
    let html = '<div class="row g-2">';
    state.danhSachNhanVien.forEach(nv => {
        let lopNut = 'nut-ten-nv btn';
        if (nv.kiemTraTen === false) lopNut += ' sai-ten';
        else if (nv.trangThai === 'Đã báo cáo') lopNut += ' da-bao-cao';
        else if (nv.trangThai === 'Off') lopNut += ' nghi';

        html += `
            <div class="col-6">
                <div class="input-group shadow-sm" style="border-radius: 0.75rem; overflow: hidden;">
                    <button class="${lopNut}" data-nv-ten="${nv.ten}" title="${nv.ten}">${nv.ten}</button>
                    <button class="btn nut-sua-nv nut-sua-nhanh-nv" data-nv-ten="${nv.ten}"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn nut-xoa-nv nut-xoa-nv-kich-hoat" data-nv-id="${nv._id}" data-nv-ten="${nv.ten}"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    $vungDsNv.html(html);
    
    const daBaoCao = state.danhSachNhanVien.filter(nv => nv.trangThai !== 'Chưa báo cáo').length;
    $('#nut-tao-bao-cao').html(`Tạo & Lưu Báo Cáo (${daBaoCao}/${state.danhSachNhanVien.length})`);
};

export const luuVaoBoNhoTam = () => {
    const data = {
        ngay: dinhDangNgayISO(new Date()),
        duLieuNv: state.danhSachNhanVien.map(n => ({ _id: n._id, baoCao: n.baoCao, trangThai: n.trangThai, kiemTraTen: n.kiemTraTen })),
        vanBanKetQua: $('#vung-ket-qua-bao-cao').val()
    };
    localStorage.setItem(KHOA_BO_NHO_TAM_CUC_BO, JSON.stringify(data));
};

export const taiDuLieuTuServer = async () => {
    hienThiTaiTrang("Đang tải danh sách FOS...");
    try {
        ghiNhanTuongTacApi().catch(() => {});
        const duLieuGoc = await thucHienGoiApi('nhanvien?h={"$orderby": {"Ten": 1}}');
        datCheDoUngDung('online');
        state.danhSachNhanVien = duLieuGoc.map(item => ({
            _id: item._id, ten: item.Ten, gioiTinh: item.GioiTinh,
            chiTieu: parseInt(item.ChiTieu, 10) || 50, baoCao: '',
            trangThai: 'Chưa báo cáo', kiemTraTen: null
        }));
        hienThiDanhSachNhanVien();
        anTaiTrang(); 
        
        // Khôi phục bộ nhớ tạm
        const tam = JSON.parse(localStorage.getItem(KHOA_BO_NHO_TAM_CUC_BO) || '{}');
        if (tam.ngay === dinhDangNgayISO(new Date())) {
            tam.duLieuNv.forEach(itemTam => {
                const nv = state.danhSachNhanVien.find(n => n._id === itemTam._id);
                if (nv) { nv.baoCao = itemTam.baoCao; nv.trangThai = itemTam.trangThai; nv.kiemTraTen = itemTam.kiemTraTen; }
            });
            if(tam.vanBanKetQua) $('#vung-ket-qua-bao-cao').val(tam.vanBanKetQua);
            hienThiDanhSachNhanVien();
        }

        lamMoiThongKeCsdl(capNhatWidgetDb).catch(() => {});
        khoiPhuPhienLamViec();
    } catch (error) {
        datCheDoUngDung('offline');
        hienThiThongBao("Chế độ ngoại tuyến", "info");
        anTaiTrang();
    }
};

export const khoiPhuPhienLamViec = async () => {
    const homNay = dinhDangNgayISO(new Date());
    try {
        const bc = await thucHienGoiApi(`report?q={"ngayBaoCao":"${homNay}"}`);
        if (bc.length > 0) {
            bc[0].baoCaoFOS.forEach(item => {
                const nv = state.danhSachNhanVien.find(n => n.ten === item.tenNhanVien);
                if (nv && nv.baoCao === '') {
                    nv.trangThai = (item.OFF === 0 || item.OFF === '0') ? 'Đã báo cáo' : 'Off';
                    nv.baoCao = item.rawReport || `Fos ${item.tenNhanVien} ${nv.trangThai === 'Off' ? 'OFF' : ''}`;
                }
            });
            hienThiDanhSachNhanVien();
        }
        
        const cu = await thucHienGoiApi(`report?q={"ngayBaoCao":{"$lt":"${homNay}"}}&h={"$orderby":{"ngayBaoCao":-1}}&max=1`);
        if (cu.length > 0) {
            state.baoCaoLichSuGanNhat = cu[0];
            state.baoCaoLichSuGanNhat.duLieuNvLichSu = cu[0].baoCaoFOS.map(i => ({ ten: i.tenNhanVien, mtdMC: i.chiSoHieuSuat.saleTrongThang }));
        }
    } catch (e) {}
};

export const reconstructReportText = (reportObj) => {
    if (!reportObj) return "";
    const tk = reportObj.tongKetToanDoi;
    let ds = reportObj.baoCaoFOS.map(item => {
        const nv = state.danhSachNhanVien.find(n => n.ten === item.tenNhanVien);
        const icon = nv ? (nv.gioiTinh === 'Nữ' ? '👵' : '👨') : '👤';
        const val = (item.OFF !== 0 && item.OFF !== "0") ? (item.OFF === 1 || item.OFF === "1" ? "OFF" : item.OFF) : `${item.chiSoHieuSuat.saleHomNay}/${item.chiSoHieuSuat.saleTrongThang}`;
        return `${icon}${item.tenNhanVien}: ${val}/${item.chiSoHieuSuat.chiTieu}`;
    });
    return `TNH ngày ${dinhDangNgayHienThi(reportObj.ngayBaoCao)}\n🔥${tk.tongSoFOS} FOS – ${tk.tongSoMC} MC\n✅NTB: ${tk.tongSoNTB}\n✅NSBQ: ${tk.NSBQ_NTB}\n✅ETB: ${tk.tongSoETB}\n✅AE+: ${tk.tongSoAEPlus}\n✅Pos: ${tk.tyLePOS}\n\n⭐️Active ${tk.tyLeActiveFOS}\n${ds.join('\n')}`;
};

// --- KHỞI CHẠY ---
$(() => {
    khoiTaoGiaoDien();
    xayDungMenuGiaoDien();
    taiDuLieuTuServer();
    initUIHandlers();
});
