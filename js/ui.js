import { state, hienThiDanhSachNhanVien, luuVaoBoNhoTam, reconstructReportText, thucHienTaoBaoCao } from './app.js';
import { hienThiThongBao, trichXuatSoLieu, dinhDangNgayHienThi, hienThiTaiTrang, anTaiTrang } from './utils.js';
import { apDungGiaoDien, luuCauHinhGiaoDien, apDungGiaoDienNgauNhien } from './theme.js';
import { thucHienGoiApi } from './api.js';
import { kiemTraTenTrongBaoCao } from './report.js';

export const initUIHandlers = () => {
    // Widget Toggle Logic
    $('#widget-toggle-btn').on('click', function() {
        const $noiDung = $('#widget-noi-dung-mo-rong');
        const $chevron = $('#widget-chevron');
        const isVisible = $noiDung.is(':visible');
        
        if (isVisible) {
            $noiDung.slideUp(200);
            $chevron.css('transform', 'rotate(0deg)');
        } else {
            $noiDung.slideDown(200);
            $chevron.css('transform', 'rotate(180deg)');
        }
    });

    // Submenu Toggle Logic
    $('#nut-mo-submenu-giao-dien').on('click', function(e) {
        e.stopPropagation();
        const $container = $('#container-submenu-giao-dien');
        const $parent = $(this).parent();
        $container.slideToggle(200);
        $parent.toggleClass('open');
    });

    // Ngăn dropdown đóng khi click vào bên trong submenu
    $('#container-submenu-giao-dien').on('click', function(e) {
        e.stopPropagation();
    });

    // Themes selection
    $('body').on('click', '.lua-chon-giao-dien', function(e) {
        e.preventDefault();
        const lop = `theme-${$(this).data('theme')}-${$(this).data('mode')}`;
        apDungGiaoDien(lop); 
        luuCauHinhGiaoDien(lop);
        hienThiThongBao(`Đã đổi sang giao diện ${lop.replace('theme-', '')}`);
    });

    $('#nut-giao-dien-ngau-nhien').on('click', e => { 
        e.preventDefault(); 
        luuCauHinhGiaoDien('random'); 
        apDungGiaoDienNgauNhien(); 
    });

    // Employee List Buttons
    $('#vung-danh-sach-nv').on('click', '.nut-ten-nv', function() {
        state.nhanVienHienTai = $(this).data('nv-ten');
        const nv = state.danhSachNhanVien.find(n => n.ten === state.nhanVienHienTai);
        if (nv) { 
            $('#modalDanBaoCaoLabel').text(`Báo cáo của ${nv.ten}`); 
            $('#noi-dung-bao-cao-nhap').val(nv.baoCao); 
            new bootstrap.Modal('#modal-dan-bao-cao').show(); 
        }
    });

    $('#vung-danh-sach-nv').on('click', '.nut-sua-nhanh-nv', function() {
        state.nhanVienHienTai = $(this).data('nv-ten');
        const nv = state.danhSachNhanVien.find(n => n.ten === state.nhanVienHienTai);
        if (nv) {
            const bc = nv.baoCao;
            $('#tieu-de-modal-sua-bao-cao').text(`Sửa nhanh: ${nv.ten}`);
            $('#ntb-sua').val(trichXuatSoLieu(bc, 'NTB')); 
            $('#etb-sua').val(trichXuatSoLieu(bc, 'ETB'));
            $('#pos-sua').val(trichXuatSoLieu(bc, 'Pos')); 
            $('#aeplus-sua').val(trichXuatSoLieu(bc, 'AE+'));
            $('#mtd-sua').val(trichXuatSoLieu(bc, 'MTD MC'));
            new bootstrap.Modal('#modal-sua-bao-cao').show();
        }
    });

    $('#vung-danh-sach-nv').on('click', '.nut-xoa-nv-kich-hoat', function() {
        state.nhanVienCanXoa = { id: $(this).data('nv-id'), ten: $(this).data('nv-ten') };
        $('#noi-dung-xac-nhan-xoa').text(`Xoá vĩnh viễn ${state.nhanVienCanXoa.ten}?`);
        new bootstrap.Modal('#modal-xac-nhan-xoa').show();
    });

    // Save/Update Actions
    $('#nut-luu-bao-cao-don').on('click', () => {
        const nv = state.danhSachNhanVien.find(n => n.ten === state.nhanVienHienTai);
        if (nv) {
            const nd = $('#noi-dung-bao-cao-nhap').val();
            nv.baoCao = nd; nv.trangThai = 'Đã báo cáo'; kiemTraTenTrongBaoCao(nv, nd);
            hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); 
            bootstrap.Modal.getInstance('#modal-dan-bao-cao').hide();
        }
    });

    $('#nut-xac-nhan-sua-bao-cao').on('click', () => {
        const nv = state.danhSachNhanVien.find(n => n.ten === state.nhanVienHienTai);
        if (nv) {
            const n = parseInt($('#ntb-sua').val()) || 0, e = parseInt($('#etb-sua').val()) || 0;
            nv.baoCao = `Fos ${nv.ten}\nNTB: ${n}\nETB: ${e}\nAE+: ${$('#aeplus-sua').val()}\nPos: ${$('#pos-sua').val()}\nMTD MC: ${$('#mtd-sua').val()}`;
            nv.trangThai = 'Đã báo cáo'; hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); 
            bootstrap.Modal.getInstance('#modal-sua-bao-cao').hide();
        }
    });

    $('#nut-xu-ly-nhieu-bao-cao').on('click', () => {
        const txt = $('#noi-dung-nhieu-bao-cao-nhap').val();
        txt.split(/(?=^Fos\s)/im).forEach(khoi => {
            const nv = state.danhSachNhanVien.find(n => new RegExp(`^Fos\\s+${n.ten}`, 'i').test(khoi.trim()));
            if (nv) { nv.baoCao = khoi.trim(); nv.trangThai = 'Đã báo cáo'; kiemTraTenTrongBaoCao(nv, khoi.trim()); }
        });
        hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); 
        bootstrap.Modal.getInstance('#modal-dan-nhieu-bao-cao').hide();
    });

    // Thêm nhân viên
    $('#nut-luu-nv-moi').on('click', async () => {
        const ten = $('#ten-nv-moi').val().trim();
        const gt = $('#gioi-tinh-nv-moi').val();
        const ct = $('#chi-tieu-nv-moi').val();
        if (!ten) return hienThiThongBao("Vui lòng nhập tên", "error");
        
        hienThiTaiTrang("Đang thêm nhân viên...");
        try {
            await thucHienGoiApi('nhanvien', 'POST', { Ten: ten, GioiTinh: gt, ChiTieu: ct });
            hienThiThongBao("Đã thêm!");
            location.reload(); 
        } catch (e) {
            hienThiThongBao("Lỗi: " + e.message, "error");
        } finally { anTaiTrang(); }
    });

    // Xoá nhân viên
    $('#nut-xoa-nv-dong-y').on('click', async () => {
        if (!state.nhanVienCanXoa) return;
        hienThiTaiTrang("Đang xoá...");
        try {
            await thucHienGoiApi(`nhanvien/${state.nhanVienCanXoa.id}`, 'DELETE');
            hienThiThongBao("Đã xoá!");
            location.reload();
        } catch (e) {
            hienThiThongBao("Lỗi: " + e.message, "error");
        } finally { anTaiTrang(); }
    });

    // History Logic
    $('#nut-xem-bao-cao-cu-kich-hoat').on('click', async () => {
        hienThiTaiTrang("Đang tải danh sách báo cáo...");
        const $s = $('#chon-ngay-lich-su'); 
        $s.html('<option value="">-- Chọn ngày --</option>');
        $('#vung-ket-qua-bao-cao-cu').val("");

        try {
            const days = await thucHienGoiApi('report?h={"$fields":{"ngayBaoCao":1},"$orderby":{"ngayBaoCao":-1}}&max=30');
            if (days && days.length > 0) {
                $s.append(days.map(d => `<option value="${d.ngayBaoCao}">${dinhDangNgayHienThi(d.ngayBaoCao)}</option>`).join(''));
            } else {
                hienThiThongBao("Không tìm thấy dữ liệu lịch sử", "info");
            }
            anTaiTrang();
            new bootstrap.Modal('#modal-xem-bao-cao-cu').show();
        } catch (e) {
            anTaiTrang();
            hienThiThongBao("Lỗi khi tải lịch sử: " + e.message, "error");
        }
    });

    $('#chon-ngay-lich-su').on('change', async function() {
        const d = $(this).val(); 
        if (!d) return $('#vung-ket-qua-bao-cao-cu').val("");
        hienThiTaiTrang("Đang tải chi tiết báo cáo...");
        try {
            const res = await thucHienGoiApi(`report?q={"ngayBaoCao":"${d}"}`);
            if (res.length > 0) $('#vung-ket-qua-bao-cao-cu').val(reconstructReportText(res[0]));
        } catch(e) {
            hienThiThongBao("Lỗi: " + e.message, "error");
        } finally { 
            anTaiTrang(); 
        }
    });

    // Utilities
    $('#nut-sao-chep').on('click', () => navigator.clipboard.writeText($('#vung-ket-qua-bao-cao').val()).then(() => hienThiThongBao("Đã sao chép!")));
    $('#nut-sao-chep-lich-su').on('click', () => navigator.clipboard.writeText($('#vung-ket-qua-bao-cao-cu').val()).then(() => hienThiThongBao("Đã sao chép!")));
    $('#nut-dan-tu-bo-nho').on('click', async () => { const t = await navigator.clipboard.readText(); if(t) $('#noi-dung-bao-cao-nhap').val(t); });

    // Final Report Generation
    $('#nut-tao-bao-cao').on('click', () => thucHienTaoBaoCao());
};