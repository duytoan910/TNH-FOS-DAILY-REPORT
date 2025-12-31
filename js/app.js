
import { KHOA_BO_NHO_TAM_CUC_BO } from './config.js';
import { hienThiThongBao, hienThiTaiTrang, anTaiTrang, dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu } from './utils.js';
import { khoiTaoGiaoDien, xayDungMenuGiaoDien } from './theme.js';
import { thucHienGoiApi, ghiNhanTuongTacApi, lamMoiThongKeCsdl, datCheDoUngDung, layCheDoUngDung } from './api.js';
import { kiemTraTenTrongBaoCao, taoCauTrucGuiBaoCao } from './report.js';
import { initUIHandlers } from './ui.js';

export const state = {
    danhSachNhanVien: [],
    baoCaoLichSuGanNhat: null,
    nhanVienHienTai: null,
    nhanVienCanXoa: null
};

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
        const duLieuGoc = await thucHienGoiApi('nhanvien?h={"$orderby":{"Ten":1}}');
        datCheDoUngDung('online');
        state.danhSachNhanVien = duLieuGoc.map(item => ({
            _id: item._id, ten: item.Ten, gioiTinh: item.GioiTinh,
            chiTieu: parseInt(item.ChiTieu, 10) || 50, baoCao: '',
            trangThai: 'Chưa báo cáo', kiemTraTen: null
        }));
        
        hienThiDanhSachNhanVien();
        
        const tam = JSON.parse(localStorage.getItem(KHOA_BO_NHO_TAM_CUC_BO) || '{}');
        if (tam.ngay === dinhDangNgayISO(new Date())) {
            tam.duLieuNv.forEach(itemTam => {
                const nv = state.danhSachNhanVien.find(n => n._id === itemTam._id);
                if (nv) { nv.baoCao = itemTam.baoCao; nv.trangThai = itemTam.trangThai; nv.kiemTraTen = itemTam.kiemTraTen; }
            });
            if(tam.vanBanKetQua) $('#vung-ket-qua-bao-cao').val(tam.vanBanKetQua);
            hienThiDanhSachNhanVien();
        }

        anTaiTrang();

        lamMoiThongKeCsdl(capNhatWidgetDb).catch(() => {});
        await khoiPhuPhienLamViec();
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

export const thucHienTaoBaoCao = async (chiXem = false) => {
    state.danhSachNhanVien.sort((a, b) => b.chiTieu - a.chiTieu);
    hienThiDanhSachNhanVien();
    const ngayHienThi = dinhDangNgayHienThi(new Date());
    let tMC = 0, tNTB = 0, tETB = 0, nvActive = 0, tPos = 0, tAE = 0;
    let dsChiTiet = [];
    const mapLs = new Map();
    if (state.baoCaoLichSuGanNhat?.duLieuNvLichSu) state.baoCaoLichSuGanNhat.duLieuNvLichSu.forEach(n => mapLs.set(n.ten, n));

    state.danhSachNhanVien.forEach(nv => {
        const icon = nv.gioiTinh === 'Nữ' ? '👵' : '👨';
        const bc = nv.baoCao;
        let mtd = trichXuatSoLieu(bc, 'MTD MC');
        let ntb = trichXuatSoLieu(bc, 'NTB'), etb = trichXuatSoLieu(bc, 'ETB');
        let mcNay = ntb + etb;
        if (mcNay === 0) mcNay = trichXuatSoLieu(bc, ['Tổng MC', 'MC']);
        if ((nv.trangThai === 'Off' || mcNay === 0) && mtd === 0 && state.baoCaoLichSuGanNhat) {
            const ls = mapLs.get(nv.ten); mtd = ls ? (ls.mtdMC || 0) : 0;
        }
        if (nv.trangThai === 'Off') {
            const m = bc.match(/^Fos\s+\S+\s+(.*)$/i);
            dsChiTiet.push(`${icon}${nv.ten}: ${(m && m[1]) ? m[1].toUpperCase() : 'OFF'}/${mtd}/${nv.chiTieu}`);
        } else {
            nvActive++; tMC += mcNay; tNTB += ntb; tETB += etb;
            tPos += trichXuatSoLieu(bc, 'Pos'); tAE += trichXuatSoLieu(bc, ['AE+', 'AE Plus']);
            dsChiTiet.push(`${icon}${nv.ten}: ${mcNay}/${mtd}/${nv.chiTieu}`);
        }
    });

    const nsbqNTB = (nvActive > 0) ? (tNTB / nvActive).toFixed(2) : '0.00';
    const nsbqETB = (nvActive > 0) ? (tETB / nvActive).toFixed(2) : '0.00';
    const res = `TNH ngày ${ngayHienThi}\n🔥${state.danhSachNhanVien.length} FOS – ${tMC} MC\n✅NTB: ${tNTB}\n✅NSBQ NTB: ${nsbqNTB}\n✅ETB: ${tETB}\n✅NSBQ ETB: ${nsbqETB}\n✅AE+: ${tAE}\n✅Pos: ${tPos}/${state.danhSachNhanVien.length * 3}\n\n⭐️Active ${nvActive}/${state.danhSachNhanVien.length}\n${dsChiTiet.join('\n')}`;
    $('#vung-ket-qua-bao-cao').val(res);
    
    if (!chiXem && layCheDoUngDung() === 'online') {
        const cauTruc = taoCauTrucGuiBaoCao(state.danhSachNhanVien, state.baoCaoLichSuGanNhat, { tongFOS: state.danhSachNhanVien.length, tongMC: tMC, tongNTB: tNTB, nsbqNTB, tongETB: tETB, nsbqETB, tongPosThucHien: tPos, posChiTieu: state.danhSachNhanVien.length * 3, activeFOS: nvActive, tongAEPlus: tAE });
        $('#chi-bao-dang-luu').css('display', 'flex');
        try {
            const check = await thucHienGoiApi(`report?q={"ngayBaoCao":"${cauTruc.ngayBaoCao}"}`);
            if (check.length > 0) await thucHienGoiApi(`report/${check[0]._id}`, 'PUT', cauTruc);
            else await thucHienGoiApi('report', 'POST', cauTruc);
            lamMoiThongKeCsdl(capNhatWidgetDb);
        } catch(e) {} finally { setTimeout(() => $('#chi-bao-dang-luu').fadeOut(), 1000); }
    }
};

export const reconstructReportText = (reportObj) => {
    if (!reportObj) return "";
    const tk = reportObj.tongKetToanDoi;
    let ds = reportObj.baoCaoFOS.map(item => {
        const nv = state.danhSachNhanVien.find(n => n.ten === item.tenNhanVien);
        const icon = nv ? (nv.gioiTinh === 'Nữ' ? '👵' : '👨') : '👤';
        const chiTieu = item.chiSoHieuSuat.chiTieu;
        const mtd = item.chiSoHieuSuat.saleTrongThang;
        
        let val;
        if (item.OFF !== 0 && item.OFF !== "0") {
            const lyDo = (item.OFF === 1 || item.OFF === "1") ? "OFF" : item.OFF;
            val = lyDo;
        } else {
            val = item.chiSoHieuSuat.saleHomNay;
        }
        
        return `${icon}${item.tenNhanVien}: ${val}/${mtd}/${chiTieu}`;
    });
    return `TNH ngày ${dinhDangNgayHienThi(reportObj.ngayBaoCao)}\n🔥${tk.tongSoFOS} FOS – ${tk.tongSoMC} MC\n✅NTB: ${tk.tongSoNTB}\n✅NSBQ: ${tk.NSBQ_NTB}\n✅ETB: ${tk.tongSoETB}\n✅AE+: ${tk.tongSoAEPlus}\n✅Pos: ${tk.tyLePOS}\n\n⭐️Active ${tk.tyLeActiveFOS}\n${ds.join('\n')}`;
};

$(() => {
    khoiTaoGiaoDien();
    xayDungMenuGiaoDien();
    taiDuLieuTuServer();
    initUIHandlers();
});
