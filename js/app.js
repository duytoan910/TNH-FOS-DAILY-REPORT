
import { thucHienGoiApi, lamMoiThongKeCsdl, ghiNhanTuongTacApi, datCheDoUngDung } from './api.js';
import { dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu, hienThiThongBao } from './utils.js';
import { khoiTaoGiaoDien, xayDungMenuGiaoDien, apDungGiaoDien, luuCauHinhGiaoDien } from './theme.js';
import { KHOA_BO_NHO_TAM_CUC_BO } from './config.js';

$(function() {
    let danhSachNhanVien = [];
    let nhanVienHienTai = null;

    // Khởi tạo giao diện ban đầu
    khoiTaoGiaoDien();
    xayDungMenuGiaoDien();
    $('#hien-thi-ngay').text(dinhDangNgayHienThi(new Date()));

    const hienThiDanhSachNhanVien = () => {
        const $vung = $('#vung-danh-sach-nv');
        if (danhSachNhanVien.length === 0) {
            $vung.html('<div class="text-center py-4 text-muted small w-100">Không có dữ liệu nhân viên.</div>');
            return;
        }

        let html = '';
        danhSachNhanVien.forEach(nv => {
            let lopNut = 'btn w-100 text-start py-2 px-3 rounded-4 shadow-sm nut-ten-nv mb-2';
            if (nv.trangThai === 'Đã báo cáo') lopNut += ' btn-reported';
            else if (nv.trangThai === 'Off') lopNut += ' btn-off';
            else lopNut += ' btn-light';

            html += `
                <div class="col-6 col-md-4 col-lg-3">
                    <button class="${lopNut}" data-nv-ten="${nv.ten}">
                        <div class="fw-bold small mb-0 text-truncate">${nv.ten}</div>
                        <div class="small opacity-50" style="font-size: 0.7rem;">${nv.trangThai}</div>
                    </button>
                </div>
            `;
        });
        $vung.html(html);
    };

    const taiDuLieuTuFileLocal = async () => {
        try {
            const response = await fetch('fos.txt');
            if (!response.ok) throw new Error("Không tìm thấy file fos.txt");
            const text = await response.text();
            
            // Format: Tên|Giới tính|Chỉ tiêu
            const lines = text.split('\n').filter(line => line.trim() !== '');
            const localData = lines.map((line, index) => {
                const parts = line.split('|');
                return {
                    _id: `local_${index}`,
                    ten: parts[0]?.trim() || 'No Name',
                    gioiTinh: parts[1]?.trim() || 'Nam',
                    chiTieu: parseInt(parts[2]) || 50,
                    trangThai: 'Chưa báo cáo',
                    baoCao: ''
                };
            });

            if (localData.length > 0) {
                danhSachNhanVien = localData;
                datCheDoUngDung('offline');
                hienThiThongBao("Đang sử dụng dữ liệu dự phòng từ fos.txt", "error");
                khoiPhucDuLieuTam();
                hienThiDanhSachNhanVien();
                capNhatWidgetTrangThai(false, localData.length, 0, 0);
            }
        } catch (error) {
            console.error("Lỗi tải file local:", error);
            hienThiThongBao("Không thể tải danh sách nhân viên!", "error");
        }
    };

    const khoiPhucDuLieuTam = () => {
        const tamStr = localStorage.getItem(KHOA_BO_NHO_TAM_CUC_BO);
        if (tamStr) {
            const tam = JSON.parse(tamStr);
            if (tam.ngay === dinhDangNgayISO(new Date())) {
                tam.duLieuNv?.forEach(t => {
                    const nv = danhSachNhanVien.find(n => n.ten === t.ten); // Tìm theo tên vì ID local có thể khác ID server
                    if (nv) {
                        nv.trangThai = t.trangThai;
                        nv.baoCao = t.baoCao;
                    }
                });
            }
        }
    };

    const capNhatWidgetTrangThai = (ok, slNv, slBc, access) => {
        const $dot = $('#cham-trang-thai-db');
        $dot.removeClass('online offline').addClass(ok ? 'online' : 'offline');
        $('#chu-trang-thai-db').text(ok ? 'RestDB Online' : 'Local Mode');
        $('#so-luong-nv-db').text(`NV: ${slNv}`);
        $('#so-luong-bao-cao-db').text(`BC: ${slBc}`);
        $('#luong-truy-cap-api').text(`(${access})`);
    };

    const taiDuLieuServer = async () => {
        try {
            const hint = encodeURIComponent('{"Ten":1}');
            const data = await thucHienGoiApi(`nhanvien?h={"$orderby":${hint}}`);
            
            if (data && Array.isArray(data)) {
                danhSachNhanVien = data.map(i => ({
                    _id: i._id,
                    ten: i.Ten,
                    gioiTinh: i.GioiTinh,
                    chiTieu: parseInt(i.ChiTieu) || 50,
                    trangThai: 'Chưa báo cáo',
                    baoCao: ''
                }));
                datCheDoUngDung('online');
                khoiPhucDuLieuTam();
                hienThiDanhSachNhanVien();
                
                lamMoiThongKeCsdl((ok, slNv, slBc, access) => {
                    capNhatWidgetTrangThai(ok, slNv, slBc, access);
                });
                ghiNhanTuongTacApi();
            } else {
                throw new Error("Dữ liệu server trống");
            }
        } catch (e) {
            console.warn("Server lỗi, chuyển sang chế độ dự phòng:", e);
            await taiDuLieuTuFileLocal();
        } finally {
            $('#lop-phu-tai-trang').fadeOut();
        }
    };

    // Events
    $(document).on('click', '.nut-ten-nv', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            $('#modalDanBaoCaoLabel').text(`Báo cáo: ${nhanVienHienTai}`);
            $('#noi-dung-bao-cao-nhap').val(nv.baoCao || '');
            const modal = new bootstrap.Modal(document.getElementById('modal-dan-bao-cao'));
            modal.show();
        }
    });

    $('#nut-luu-bao-cao-don').on('click', function() {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            nv.baoCao = $('#noi-dung-bao-cao-nhap').val();
            nv.trangThai = 'Đã báo cáo';
            hienThiDanhSachNhanVien();
            bootstrap.Modal.getInstance(document.getElementById('modal-dan-bao-cao')).hide();
            hienThiThongBao(`Đã cập nhật ${nv.ten}`);
            luuTamLocalStorage();
        }
    });

    $('#nut-danh-dau-off').on('click', function() {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            nv.baoCao = `Fos ${nv.ten} OFF`;
            nv.trangThai = 'Off';
            hienThiDanhSachNhanVien();
            bootstrap.Modal.getInstance(document.getElementById('modal-dan-bao-cao')).hide();
            luuTamLocalStorage();
        }
    });

    const luuTamLocalStorage = () => {
        localStorage.setItem(KHOA_BO_NHO_TAM_CUC_BO, JSON.stringify({
            ngay: dinhDangNgayISO(new Date()),
            duLieuNv: danhSachNhanVien.map(n => ({ ten: n.ten, trangThai: n.trangThai, baoCao: n.baoCao }))
        }));
    };

    $('#nut-tao-bao-cao').on('click', function() {
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
            } else if (nv.trangThai === 'Đã báo cáo') {
                active++; tMC += mc; tNTB += n; tETB += e;
                tPos += trichXuatSoLieu(bc, 'Pos');
                tAE += trichXuatSoLieu(bc, 'AE+');
                details.push(`- ${nv.ten}: ${mc}/${mtd}/${nv.chiTieu}`);
            } else {
                details.push(`- ${nv.ten}: Chưa báo cáo`);
            }
        });

        const res = `BÁO CÁO FOS ${dinhDangNgayHienThi(new Date())}\n` +
                    `Tổng MC: ${tMC} | NTB: ${tNTB} | ETB: ${tETB}\n` +
                    `AE+: ${tAE} | Pos: ${tPos}\n` +
                    `Hoạt động: ${active}/${danhSachNhanVien.length}\n\n` +
                    `CHI TIẾT:\n${details.join('\n')}`;
        
        $('#vung-ket-qua-bao-cao').val(res);
        hienThiThongBao("Đã tổng hợp báo cáo!");
        luuTamLocalStorage();
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

    // Bắt đầu quy trình tải dữ liệu
    taiDuLieuServer();
});
