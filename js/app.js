
import { thucHienGoiApi, lamMoiThongKeCsdl, ghiNhanTuongTacApi } from './api.js';
import { dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu, hienThiThongBao } from './utils.js';
import { khoiTaoGiaoDien, xayDungMenuGiaoDien, apDungGiaoDien, luuCauHinhGiaoDien } from './theme.js';
import { kiemTraTenTrongBaoCao, taoCauTrucGuiBaoCao } from './report.js';
import { KHOA_BO_NHO_TAM_CUC_BO } from './config.js';

$(function() {
    let danhSachNhanVien = [];
    let nhanVienHienTai = null;

    // Khởi tạo giao diện
    khoiTaoGiaoDien();
    xayDungMenuGiaoDien();
    $('#hien-thi-ngay').text(dinhDangNgayHienThi(new Date()));

    const hienThiDanhSachNhanVien = () => {
        const $vung = $('#vung-danh-sach-nv');
        if (danhSachNhanVien.length === 0) {
            $vung.html('<div class="text-center py-4 text-muted small">Đang tải dữ liệu...</div>');
            return;
        }

        let html = '';
        danhSachNhanVien.forEach(nv => {
            let lopNut = 'btn w-100 text-start py-2 px-3 rounded-4 shadow-sm nut-ten-nv';
            if (nv.trangThai === 'Đã báo cáo') lopNut += ' btn-reported';
            else if (nv.trangThai === 'Off') lopNut += ' btn-off';
            else lopNut += ' btn-light';

            html += `
                <div class="col-6 col-md-4 col-lg-3">
                    <button class="${lopNut}" data-nv-ten="${nv.ten}">
                        <div class="fw-bold small mb-0">${nv.ten}</div>
                        <div class="small opacity-50" style="font-size: 0.7rem;">${nv.trangThai}</div>
                    </button>
                </div>
            `;
        });
        $vung.html(html);
    };

    const taiDuLieuServer = async () => {
        try {
            const data = await thucHienGoiApi('nhanvien?h={"$orderby":{"Ten":1}}');
            danhSachNhanVien = data.map(i => ({
                _id: i._id,
                ten: i.Ten,
                gioiTinh: i.GioiTinh,
                chiTieu: parseInt(i.ChiTieu) || 50,
                trangThai: 'Chưa báo cáo',
                baoCao: ''
            }));
            
            // Khôi phục từ bộ nhớ tạm
            const tam = JSON.parse(localStorage.getItem(KHOA_BO_NHO_TAM_CUC_BO) || '{}');
            if (tam.ngay === dinhDangNgayISO(new Date())) {
                tam.duLieuNv?.forEach(t => {
                    const nv = danhSachNhanVien.find(n => n._id === t._id);
                    if (nv) {
                        nv.trangThai = t.trangThai;
                        nv.baoCao = t.baoCao;
                    }
                });
            }

            hienThiDanhSachNhanVien();
            lamMoiThongKeCsdl((ok, slNv, slBc, access) => {
                $('#cham-trang-thai-db').addClass(ok ? 'online' : 'offline');
                $('#chu-trang-thai-db').text(ok ? 'RestDB Connected' : 'Disconnected');
                $('#so-luong-nv-db').text(`NV: ${slNv}`);
                $('#so-luong-bao-cao-db').text(`BC: ${slBc}`);
                $('#luong-truy-cap-api').text(`(${access})`);
            });
            ghiNhanTuongTacApi();
        } catch (e) {
            hienThiThongBao("Lỗi kết nối server", "error");
        } finally {
            $('#lop-phu-tai-trang').fadeOut();
        }
    };

    // Events
    $(document).on('click', '.nut-ten-nv', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        $('#modalDanBaoCaoLabel').text(`Báo cáo: ${nhanVienHienTai}`);
        $('#noi-dung-bao-cao-nhap').val(nv.baoCao || '');
        const modal = new bootstrap.Modal('#modal-dan-bao-cao');
        modal.show();
    });

    $('#nut-luu-bao-cao-don').on('click', function() {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            nv.baoCao = $('#noi-dung-bao-cao-nhap').val();
            nv.trangThai = 'Đã báo cáo';
            hienThiDanhSachNhanVien();
            bootstrap.Modal.getInstance('#modal-dan-bao-cao').hide();
            hienThiThongBao(`Đã cập nhật ${nv.ten}`);
        }
    });

    $('#nut-danh-dau-off').on('click', function() {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            nv.baoCao = `Fos ${nv.ten} OFF`;
            nv.trangThai = 'Off';
            hienThiDanhSachNhanVien();
            bootstrap.Modal.getInstance('#modal-dan-bao-cao').hide();
        }
    });

    $('#nut-tao-bao-cao').on('click', function() {
        // Logic tạo báo cáo tương tự bản cũ nhưng dùng report.js
        let tMC = 0, tNTB = 0, tETB = 0, tPos = 0, tAE = 0, active = 0;
        let details = [];

        danhSachNhanVien.forEach(nv => {
            const bc = nv.baoCao || '';
            const n = trichXuatSoLieu(bc, 'NTB');
            const e = trichXuatSoLieu(bc, 'ETB');
            const mtd = trichXuatSoLieu(bc, 'MTD MC');
            const mc = n + e || trichXuatSoLieu(bc, 'MC');
            
            if (nv.trangThai === 'Off') {
                details.push(`- ${nv.ten}: OFF (${mtd}/${nv.chiTieu})`);
            } else {
                active++; tMC += mc; tNTB += n; tETB += e;
                tPos += trichXuatSoLieu(bc, 'Pos');
                tAE += trichXuatSoLieu(bc, 'AE+');
                details.push(`- ${nv.ten}: ${mc}/${mtd}/${nv.chiTieu}`);
            }
        });

        const res = `BÁO CÁO FOS ${dinhDangNgayHienThi(new Date())}\n` +
                    `Tổng MC: ${tMC} | NTB: ${tNTB} | ETB: ${tETB}\n` +
                    `AE+: ${tAE} | Pos: ${tPos}\n` +
                    `Hoạt động: ${active}/${danhSachNhanVien.length}\n\n` +
                    `CHI TIẾT:\n${details.join('\n')}`;
        
        $('#vung-ket-qua-bao-cao').val(res);
        hienThiThongBao("Đã tổng hợp báo cáo!");
        
        // Lưu cache
        localStorage.setItem(KHOA_BO_NHO_TAM_CUC_BO, JSON.stringify({
            ngay: dinhDangNgayISO(new Date()),
            duLieuNv: danhSachNhanVien.map(n => ({ _id: n._id, trangThai: n.trangThai, baoCao: n.baoCao }))
        }));
    });

    $('#nut-sao-chep').on('click', function() {
        const val = $('#vung-ket-qua-bao-cao').val();
        if (val) {
            navigator.clipboard.writeText(val).then(() => hienThiThongBao("Đã sao chép vào bộ nhớ tạm"));
        }
    });

    $(document).on('click', '.lua-chon-giao-dien', function(e) {
        e.preventDefault();
        const theme = $(this).data('theme');
        const mode = $(this).data('mode');
        const className = `theme-${theme}-${mode}`;
        apDungGiaoDien(className);
        luuCauHinhGiaoDien(className);
    });

    // Khởi động
    taiDuLieuServer();
});
