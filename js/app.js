
import { KHOA_BO_NHO_TAM_CUC_BO } from './config.js';
import { hienThiThongBao, hienThiTaiTrang, anTaiTrang, dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu } from './utils.js';
import { khoiTaoGiaoDien, xayDungMenuGiaoDien, apDungGiaoDien, luuCauHinhGiaoDien, apDungGiaoDienNgauNhien } from './theme.js';
import { thucHienGoiApi, ghiNhanTuongTacApi, lamMoiThongKeCsdl, datCheDoUngDung, layCheDoUngDung } from './api.js';
import { kiemTraTenTrongBaoCao, taoCauTrucGuiBaoCao } from './report.js';

// Add global declarations for external libraries
declare var $: any;
declare var bootstrap: any;

$(function() {
    let danhSachNhanVien = []; 
    let baoCaoLichSuGanNhat = null; 
    let nhanVienHienTai = null;
    let nhanVienCanXoa = null;
    
    const modalThemNv = new bootstrap.Modal('#modal-them-nhan-vien');
    const modalDanBaoCao = new bootstrap.Modal('#modal-dan-bao-cao');
    const modalSuaBaoCao = new bootstrap.Modal('#modal-sua-bao-cao');
    const modalDanNhieuBaoCao = new bootstrap.Modal('#modal-dan-nhieu-bao-cao');
    const modalXacNhanXoa = new bootstrap.Modal('#modal-xac-nhan-xoa');

    const capNhatWidgetDb = (trucTuyen, slNv, slBaoCao, slTruyCap) => {
        const $cham = $('#cham-trang-thai-db');
        const $chu = $('#chu-trang-thai-db');
        if (trucTuyen) {
            $cham.removeClass('offline').addClass('online');
            $chu.text('RestDB Online');
        } else {
            $cham.removeClass('online').addClass('offline');
            $chu.text('Offline');
        }
        if (slNv !== null) $('#so-luong-nv-db').text(`NV: ${slNv}`);
        if (slBaoCao !== null) $('#so-luong-bao-cao-db').text(`BC: ${slBaoCao}`);
        if (slTruyCap !== null) $('#luong-truy-cap-api').text(`(${slTruyCap})`);
    }

    const hienThiDanhSachNhanVien = () => {
        const $vungDsNv = $('#vung-danh-sach-nv');
        if (danhSachNhanVien.length === 0) {
            $vungDsNv.html('<div class="text-center py-3 text-muted">Danh sách trống.</div>');
            return;
        }
        
        let html = '<div class="row g-2">';
        danhSachNhanVien.forEach(nv => {
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
        const daBaoCao = danhSachNhanVien.filter(nv => nv.trangThai !== 'Chưa báo cáo').length;
        $('#nut-tao-bao-cao').html(`Tạo & Lưu Báo Cáo (${daBaoCao}/${danhSachNhanVien.length})`);
    };

    const luuVaoBoNhoTam = () => {
        const data = {
            ngay: dinhDangNgayISO(new Date()),
            duLieuNv: danhSachNhanVien.map(n => ({ _id: n._id, baoCao: n.baoCao, trangThai: n.trangThai, kiemTraTen: n.kiemTraTen })),
            vanBanKetQua: $('#vung-ket-qua-bao-cao').val()
        };
        localStorage.setItem(KHOA_BO_NHO_TAM_CUC_BO, JSON.stringify(data));
    };

    const taiDuLieuTuServer = async () => {
        hienThiTaiTrang("Đang kết nối RestDB...");
        try {
            ghiNhanTuongTacApi().catch(() => {});
            const duLieuGoc = await thucHienGoiApi('nhanvien?h={"$orderby":{"Ten":1}}');
            datCheDoUngDung('online');
            danhSachNhanVien = duLieuGoc.map(item => ({
                _id: item._id, ten: item.Ten, gioiTinh: item.GioiTinh,
                chiTieu: parseInt(item.ChiTieu, 10) || 50, baoCao: '',
                trangThai: 'Chưa báo cáo', kiemTraTen: null
            }));
            
            hienThiDanhSachNhanVien();
            anTaiTrang();
            
            const tam = JSON.parse(localStorage.getItem(KHOA_BO_NHO_TAM_CUC_BO) || '{}');
            if (tam.ngay === dinhDangNgayISO(new Date())) {
                tam.duLieuNv.forEach(itemTam => {
                    const nv = danhSachNhanVien.find(n => n._id === itemTam._id);
                    if (nv) { nv.baoCao = itemTam.baoCao; nv.trangThai = itemTam.trangThai; nv.kiemTraTen = itemTam.kiemTraTen; }
                });
                if(tam.vanBanKetQua) $('#vung-ket-qua-bao-cao').val(tam.vanBanKetQua);
                hienThiDanhSachNhanVien();
            }

            lamMoiThongKeCsdl(capNhatWidgetDb).catch(() => {});
            khoiPhuPhienLamViec().catch(() => {});
        } catch (error) {
            datCheDoUngDung('offline');
            hienThiThongBao("Chế độ ngoại tuyến", "info");
            anTaiTrang();
        }
    };

    const khoiPhuPhienLamViec = async () => {
        const homNayStr = dinhDangNgayISO(new Date());
        try {
            const bc = await thucHienGoiApi(`report?q={"ngayBaoCao":"${homNayStr}"}`);
            if (bc.length > 0) {
                bc[0].baoCaoFOS.forEach(item => {
                    const nv = danhSachNhanVien.find(n => n.ten === item.tenNhanVien);
                    if (nv && nv.baoCao === '') {
                        nv.trangThai = (item.OFF === 0 || item.OFF === '0') ? 'Đã báo cáo' : 'Off';
                        nv.baoCao = item.rawReport || `Fos ${item.tenNhanVien} ${nv.trangThai === 'Off' ? 'OFF' : ''}`;
                    }
                });
                hienThiDanhSachNhanVien();
            }
            const cu = await thucHienGoiApi(`report?q={"ngayBaoCao":{"$lt":"${homNayStr}"}}&h={"$orderby":{"ngayBaoCao":-1}}&max=1`);
            if (cu.length > 0) {
                baoCaoLichSuGanNhat = cu[0];
                baoCaoLichSuGanNhat.duLieuNvLichSu = cu[0].baoCaoFOS.map(i => ({ ten: i.tenNhanVien, mtdMC: i.chiSoHieuSuat.saleTrongThang }));
                let txt = `Lịch sử ${dinhDangNgayHienThi(cu[0].ngayBaoCao)}:\n`;
                baoCaoLichSuGanNhat.duLieuNvLichSu.forEach(n => txt += `${n.ten}: ${n.mtdMC}\n`);
                $('#vung-ket-qua-bao-cao-cu').val(txt);
            }
        } catch (e) {}
    };

    const thucHienTaoBaoCao = async () => {
        danhSachNhanVien.sort((a, b) => b.chiTieu - a.chiTieu);
        hienThiDanhSachNhanVien();
        const ngayHienThi = dinhDangNgayHienThi(new Date());
        let tMC = 0, tNTB = 0, tETB = 0, nvActive = 0, tPos = 0, tAE = 0;
        let dsChiTiet = [];
        const mapLs = new Map();
        if (baoCaoLichSuGanNhat?.duLieuNvLichSu) baoCaoLichSuGanNhat.duLieuNvLichSu.forEach(n => mapLs.set(n.ten, n));

        danhSachNhanVien.forEach(nv => {
            const icon = nv.gioiTinh === 'Nữ' ? '👵' : '👨';
            const bc = nv.baoCao;
            let mtd = trichXuatSoLieu(bc, 'MTD MC');
            let ntb = trichXuatSoLieu(bc, 'NTB'), etb = trichXuatSoLieu(bc, 'ETB');
            let mcNay = ntb + etb;
            if (mcNay === 0) mcNay = trichXuatSoLieu(bc, ['Tổng MC', 'MC']);
            if ((nv.trangThai === 'Off' || mcNay === 0) && mtd === 0 && baoCaoLichSuGanNhat) {
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
        const res = `TNH ngày ${ngayHienThi}\n🔥${danhSachNhanVien.length} FOS – ${tMC} MC\n✅NTB: ${tNTB}\n✅NSBQ: ${nsbqNTB}\n✅ETB: ${tETB}\n✅AE+: ${tAE}\n✅Pos: ${tPos}/${danhSachNhanVien.length * 3}\n\n⭐️Active ${nvActive}/${danhSachNhanVien.length}\n${dsChiTiet.join('\n')}`;
        $('#vung-ket-qua-bao-cao').val(res);
        
        if (layCheDoUngDung() === 'online') {
            const cauTruc = taoCauTrucGuiBaoCao(danhSachNhanVien, baoCaoLichSuGanNhat, { tongFOS: danhSachNhanVien.length, tongMC: tMC, tongNTB: tNTB, nsbqNTB, tongETB: tETB, nsbqETB: (tETB/nvActive).toFixed(2), tongPosThucHien: tPos, posChiTieu: danhSachNhanVien.length * 3, activeFOS: nvActive, tongAEPlus: tAE });
            $('#chi-bao-dang-luu').css('display', 'flex');
            try {
                const check = await thucHienGoiApi(`report?q={"ngayBaoCao":"${cauTruc.ngayBaoCao}"}`);
                if (check.length > 0) await thucHienGoiApi(`report/${check[0]._id}`, 'PUT', cauTruc);
                else await thucHienGoiApi('report', 'POST', cauTruc);
                lamMoiThongKeCsdl(capNhatWidgetDb);
            } catch(e) {} finally { setTimeout(() => $('#chi-bao-dang-luu').fadeOut(), 1000); }
        }
    };

    // --- Events ---
    $('#nut-tao-bao-cao').on('click', thucHienTaoBaoCao);
    $('#nut-sao-chep').on('click', () => {
        navigator.clipboard.writeText($('#vung-ket-qua-bao-cao').val()).then(() => hienThiThongBao("Đã sao chép báo cáo!"));
    });

    $('body').on('click', '.nut-ten-nv', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) { 
            $('#modalDanBaoCaoLabel').text(`Báo cáo: ${nhanVienHienTai}`); 
            $('#noi-dung-bao-cao-nhap').val(nv.baoCao); 
            modalDanBaoCao.show(); 
        }
    });

    $('#nut-luu-bao-cao-don').on('click', () => {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            const nd = $('#noi-dung-bao-cao-nhap').val();
            nv.baoCao = nd; nv.trangThai = 'Đã báo cáo'; kiemTraTenTrongBaoCao(nv, nd);
            hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalDanBaoCao.hide();
        }
    });

    $('#nut-danh-dau-off').on('click', () => {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) { nv.baoCao = `Fos ${nv.ten} OFF`; nv.trangThai = 'Off'; hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalDanBaoCao.hide(); }
    });

    $('#vung-danh-sach-nv').on('click', '.nut-sua-nhanh-nv', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            const bc = nv.baoCao;
            $('#ntb-sua').val(trichXuatSoLieu(bc, 'NTB')); $('#etb-sua').val(trichXuatSoLieu(bc, 'ETB'));
            $('#pos-sua').val(trichXuatSoLieu(bc, 'Pos')); $('#aeplus-sua').val(trichXuatSoLieu(bc, 'AE+'));
            $('#mtd-sua').val(trichXuatSoLieu(bc, 'MTD MC'));
            modalSuaBaoCao.show();
        }
    });

    $('#nut-xac-nhan-sua-bao-cao').on('click', () => {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            const n = parseInt($('#ntb-sua').val()) || 0, e = parseInt($('#etb-sua').val()) || 0;
            nv.baoCao = `Fos ${nv.ten}\nNTB: ${n}\nETB: ${e}\nAE+: ${$('#aeplus-sua').val()}\nPos: ${$('#pos-sua').val()}\nMTD MC: ${$('#mtd-sua').val()}`;
            nv.trangThai = 'Đã báo cáo'; hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalSuaBaoCao.hide();
        }
    });

    $('#nut-xu-ly-nhieu-bao-cao').on('click', () => {
        const txt = $('#noi-dung-nhieu-bao-cao-nhap').val();
        txt.split(/(?=^Fos\s)/im).forEach(khoi => {
            const nv = danhSachNhanVien.find(n => new RegExp(`^Fos\\s+${n.ten}`, 'i').test(khoi.trim()));
            if (nv) { nv.baoCao = khoi.trim(); nv.trangThai = 'Đã báo cáo'; kiemTraTenTrongBaoCao(nv, khoi.trim()); }
        });
        hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalDanNhieuBaoCao.hide();
    });

    $('#nut-luu-nv-moi').on('click', async () => {
        const ten = $('#ten-nv-modal').val().trim(), gt = $('#gioi-tinh-nv-modal').val(), ct = $('#chi-tieu-nv-modal').val();
        if (ten) {
            try { await thucHienGoiApi('nhanvien', 'POST', { Ten: ten, GioiTinh: gt, ChiTieu: ct }); modalThemNv.hide(); taiDuLieuTuServer(); }
            catch (e: any) { hienThiThongBao(e.message, 'error'); }
        }
    });

    $('#vung-danh-sach-nv').on('click', '.nut-xoa-nv-kich-hoat', function() {
        nhanVienCanXoa = { id: $(this).data('nv-id'), ten: $(this).data('nv-ten') };
        $('#noi-dung-xac-nhan-xoa').text(`Xoá vĩnh viễn ${nhanVienCanXoa.ten}?`);
        modalXacNhanXoa.show();
    });

    $('#nut-xac-nhan-xoa-vinh-vien').on('click', async () => {
        try { await thucHienGoiApi(`nhanvien/${nhanVienCanXoa.id}`, 'DELETE'); taiDuLieuTuServer(); modalXacNhanXoa.hide(); }
        catch (e: any) { hienThiThongBao(e.message, 'error'); }
    });

    // Theme stuff
    $('body').on('click', '.lua-chon-giao-dien', function(e) {
        e.preventDefault();
        const lop = `theme-${$(this).data('theme')}-${$(this).data('mode')}`;
        apDungGiaoDien(lop); luuCauHinhGiaoDien(lop);
    });
    $('#nut-giao-dien-ngau-nhien').on('click', e => { e.preventDefault(); luuCauHinhGiaoDien('random'); apDungGiaoDienNgauNhien(); });

    khoiTaoGiaoDien();
    xayDungMenuGiaoDien();
    taiDuLieuTuServer();
});