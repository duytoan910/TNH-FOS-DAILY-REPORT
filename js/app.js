
import { KHOA_BO_NHO_TAM_CUC_BO } from './config.js';
import { hienThiThongBao, hienThiTaiTrang, anTaiTrang, dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu } from './utils.js';
import { khoiTaoGiaoDien, xayDungMenuGiaoDien, apDungGiaoDien, luuCauHinhGiaoDien, apDungGiaoDienNgauNhien } from './theme.js';
import { thucHienGoiApi, ghiNhanTuongTacApi, lamMoiThongKeCsdl, datCheDoUngDung, layCheDoUngDung } from './api.js';
import { kiemTraTenTrongBaoCao, taoCauTrucGuiBaoCao } from './report.js';

$(function() {
    // --- TRẠNG THÁI ỨNG DỤNG ---
    let danhSachNhanVien = []; 
    let baoCaoLichSuGanNhat = null; 
    let ngayBaoCaoLichSu = null; 
    let nhanVienHienTai = null;
    let nhanVienCanXoa = null;
    
    // --- KHỞI TẠO MODAL BOOTSTRAP ---
    const modalThemNv = new bootstrap.Modal('#modal-them-nhan-vien');
    const modalDanBaoCao = new bootstrap.Modal('#modal-dan-bao-cao');
    const modalSuaBaoCao = new bootstrap.Modal('#modal-sua-bao-cao');
    const modalDanNhieuBaoCao = new bootstrap.Modal('#modal-dan-nhieu-bao-cao');
    const modalXacNhanXoa = new bootstrap.Modal('#modal-xac-nhan-xoa');
    const modalXemBaoCaoCu = new bootstrap.Modal('#modal-xem-bao-cao-cu');

    // --- CẬP NHẬT THÔNG TIN BUILD ---
    const phienBanBuild = "v1.3.3-stable";
    const thoiGianBuildStr = "2025.02.21 20:10"; 
    $('#thoi-gian-build').html(`Build: ${thoiGianBuildStr}`);
    $('.build-info-widget .fw-bold').text(phienBanBuild);

    const capNhatWidgetDb = (trucTuyen, slNv, slBaoCao, slTruyCap) => {
        const $cham = $('#cham-trang-thai-db');
        const $chu = $('#chu-trang-thai-db');
        const $nv = $('#so-luong-nv-db');
        const $bc = $('#so-luong-bao-cao-db');
        const $luong = $('#luong-truy-cap-api');
        
        if (trucTuyen) {
            $cham.removeClass('offline').addClass('online');
            $chu.text('RestDB Online');
        } else {
            $cham.removeClass('online').addClass('offline');
            $chu.text('Chế độ Offline');
        }
        if (slNv !== null) $nv.text(`NV: ${slNv}`);
        if (slBaoCao !== null) $bc.text(`Rpt: ${slBaoCao}`);
        if (slTruyCap !== null) $luong.text(`(${slTruyCap})`);
    }

    const $vungDsNv = $('#vung-danh-sach-nv');
    
    const capNhatNutTaoBaoCao = () => {
        const daBaoCao = danhSachNhanVien.filter(nv => nv.trangThai !== 'Chưa báo cáo').length;
        const tongSo = danhSachNhanVien.length;
        $('#nut-tao-bao-cao').html(`Tạo & Lưu Báo Cáo (${daBaoCao}/${tongSo})`);
    };

    const hienThiDanhSachNhanVien = () => {
        if (danhSachNhanVien.length === 0) {
             $vungDsNv.html('<div class="text-center py-3 text-muted">Danh sách trống.</div>');
             capNhatNutTaoBaoCao();
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
                        <button class="${lopNut}" data-nv-ten="${nv.ten}" title="${nv.ten}">
                            ${nv.ten}
                        </button>
                        <button class="btn nut-sua-nv nut-sua-nhanh-nv" data-nv-ten="${nv.ten}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn nut-xoa-nv nut-xoa-nv-kich-hoat" data-nv-id="${nv._id}" data-nv-ten="${nv.ten}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        $vungDsNv.html(html);
        capNhatNutTaoBaoCao();
    };

    const luuVaoBoNhoTam = () => {
        const homNayStr = dinhDangNgayISO(new Date());
        const duLieu = {
            ngay: homNayStr,
            duLieuNv: danhSachNhanVien.map(n => ({
                _id: n._id, baoCao: n.baoCao, trangThai: n.trangThai, kiemTraTen: n.kiemTraTen
            })),
            vanBanKetQua: $('#vung-ket-qua-bao-cao').val()
        };
        localStorage.setItem(KHOA_BO_NHO_TAM_CUC_BO, JSON.stringify(duLieu));
    };

    const khoiPhuTuBoNhoTam = () => {
        const duLieuTho = localStorage.getItem(KHOA_BO_NHO_TAM_CUC_BO);
        if (!duLieuTho) return false;
        try {
            const duLieu = JSON.parse(duLieuTho);
            if (duLieu.ngay !== dinhDangNgayISO(new Date())) {
                localStorage.removeItem(KHOA_BO_NHO_TAM_CUC_BO);
                return false;
            }
            duLieu.duLieuNv.forEach(itemTam => {
                const nv = danhSachNhanVien.find(n => n._id === itemTam._id);
                if (nv && itemTam.baoCao) {
                    nv.baoCao = itemTam.baoCao; 
                    nv.trangThai = itemTam.trangThai; 
                    nv.kiemTraTen = itemTam.kiemTraTen;
                }
            });
            hienThiDanhSachNhanVien();
            if(duLieu.vanBanKetQua) $('#vung-ket-qua-bao-cao').val(duLieu.vanBanKetQua);
            return true;
        } catch (e) { return false; }
    };

    const taiDuLieuTuServer = async () => {
        hienThiTaiTrang("Đang kết nối hệ thống...");
        try {
            ghiNhanTuongTacApi().catch(() => {});
            
            const duLieuGoc = await thucHienGoiApi('nhanvien?h={"$orderby": {"Ten": 1}}');
            datCheDoUngDung('online');
            danhSachNhanVien = duLieuGoc.map(item => ({
                _id: item._id, ten: item.Ten, gioiTinh: item.GioiTinh,
                chiTieu: parseInt(item.ChiTieu, 10) || 50, baoCao: '',
                trangThai: 'Chưa báo cáo', kiemTraTen: null
            }));
            hienThiDanhSachNhanVien();
            khoiPhuTuBoNhoTam();
            lamMoiThongKeCsdl(capNhatWidgetDb);
            await khoiPhuPhienLamViec();
        } catch (error) {
            datCheDoUngDung('offline');
            hienThiThongBao("Đang hoạt động ngoại tuyến", "info");
            try {
                const phanHoi = await fetch('fos.txt');
                const text = await phanHoi.text();
                danhSachNhanVien = text.split('\n').filter(l => l.trim()).map((line, index) => {
                    const parts = line.split('|');
                    return {
                        _id: `local_${index}`, ten: parts[0]?.trim(), gioiTinh: parts[1]?.trim(), 
                        chiTieu: parseInt(parts[2]?.trim() || '50'), baoCao: '', 
                        trangThai: 'Chưa báo cáo', kiemTraTen: null
                    };
                });
                hienThiDanhSachNhanVien();
                khoiPhuTuBoNhoTam();
            } catch (e) {}
        } finally { 
            anTaiTrang(); 
        }
    };

    const khoiPhuPhienLamViec = async () => {
        const homNayStr = dinhDangNgayISO(new Date());
        
        try {
            const bcHomNay = await thucHienGoiApi(`report?q={"ngayBaoCao": "${homNayStr}"}`);
            if (bcHomNay.length > 0) {
                bcHomNay[0].baoCaoFOS.forEach(item => {
                    const nv = danhSachNhanVien.find(n => n.ten === item.tenNhanVien);
                    if (nv && nv.baoCao === '') {
                        nv.trangThai = (item.OFF === 0 || item.OFF === '0') ? 'Đã báo cáo' : 'Off';
                        nv.baoCao = item.rawReport || `Fos ${item.tenNhanVien} ${nv.trangThai === 'Off' ? 'OFF' : ''}`;
                    }
                });
                hienThiDanhSachNhanVien();
            }
        } catch (e) {}

        // Lấy mốc lịch sử thực sự cũ hơn hôm nay
        try {
            const truyVanLichSu = `{"ngayBaoCao": {"$lt": "${homNayStr}"}}`;
            const sapXepLichSu = `{"$orderby": {"ngayBaoCao": -1}}`;
            const dsBcCu = await thucHienGoiApi(`report?q=${truyVanLichSu}&h=${sapXepLichSu}&max=1`);
            
            if (dsBcCu.length > 0) {
                const bcLichSu = dsBcCu[0];
                baoCaoLichSuGanNhat = bcLichSu;
                ngayBaoCaoLichSu = bcLichSu.ngayBaoCao;
                baoCaoLichSuGanNhat.duLieuNvLichSu = bcLichSu.baoCaoFOS.map(item => ({
                    ten: item.tenNhanVien, 
                    mtdMC: item.chiSoHieuSuat.saleTrongThang
                }));

                let txt = `Chốt mốc ngày ${dinhDangNgayHienThi(ngayBaoCaoLichSu)}:\n`;
                baoCaoLichSuGanNhat.duLieuNvLichSu.forEach(n => txt += `${n.ten}: MTD ${n.mtdMC}\n`);
                $('#vung-ket-qua-bao-cao-cu').val(txt);
                thucHienTaoBaoCao(null, true);
            }
        } catch (e) {}
    };

    const luuBaoCaoLenServer = async (cauTruc, chayNgam = false) => {
        if (layCheDoUngDung() === 'offline') return;
        if (chayNgam) $('#chi-bao-dang-luu').css('display', 'flex');
        try {
            const kiemTra = await thucHienGoiApi(`report?q={"ngayBaoCao": "${cauTruc.ngayBaoCao}"}`);
            if (kiemTra.length > 0) await thucHienGoiApi(`report/${kiemTra[0]._id}`, 'PUT', cauTruc);
            else await thucHienGoiApi('report', 'POST', cauTruc);
            lamMoiThongKeCsdl(capNhatWidgetDb);
        } catch (error) {} finally { setTimeout(() => $('#chi-bao-dang-luu').fadeOut(), 1000); }
    };
    
    const thucHienTaoBaoCao = (e, chiXem = false) => {
        danhSachNhanVien.sort((a, b) => b.chiTieu - a.chiTieu);
        hienThiDanhSachNhanVien();
        const quanLy = 'TNH';
        const ngayHienThi = dinhDangNgayHienThi(new Date());
        let tMC = 0, tNTB = 0, tETB = 0, nvActive = 0, tPos = 0, tAE = 0;
        let dsChiTiet = [];
        const banDoLichSu = new Map();
        if (baoCaoLichSuGanNhat?.duLieuNvLichSu) baoCaoLichSuGanNhat.duLieuNvLichSu.forEach(n => banDoLichSu.set(n.ten, n));

        danhSachNhanVien.forEach(nv => {
            const bieuTuong = nv.gioiTinh === 'Nữ' ? '👵' : '👨';
            const bc = nv.baoCao;
            let mtd = trichXuatSoLieu(bc, 'MTD MC');
            let ntb = trichXuatSoLieu(bc, 'NTB'), etb = trichXuatSoLieu(bc, 'ETB');
            let mcNay = ntb + etb;
            if (mcNay === 0) mcNay = trichXuatSoLieu(bc, ['Tổng MC', 'MC']);

            if ((nv.trangThai === 'Off' || mcNay === 0) && mtd === 0 && baoCaoLichSuGanNhat) {
                const nvLichSu = banDoLichSu.get(nv.ten);
                mtd = nvLichSu ? (nvLichSu.mtdMC || 0) : 0;
            }

            if (nv.trangThai === 'Off') {
                const matchLyDo = bc.match(/^Fos\s+\S+\s+(.*)$/i);
                const lyDo = (matchLyDo && matchLyDo[1] && matchLyDo[1].toUpperCase() !== 'OFF') ? matchLyDo[1] : 'OFF';
                dsChiTiet.push(`${bieuTuong}${nv.ten}: ${lyDo}/${mtd}/${nv.chiTieu}`);
            } else {
                nvActive++;
                tMC += mcNay; tNTB += ntb; tETB += etb;
                tPos += trichXuatSoLieu(bc, 'Pos'); tAE += trichXuatSoLieu(bc, ['AE+', 'AE Plus']);
                dsChiTiet.push(`${bieuTuong}${nv.ten}: ${mcNay}/${mtd}/${nv.chiTieu}`);
            }
        });

        const nsbqNTB = (nvActive > 0) ? (tNTB / nvActive).toFixed(2) : '0.00';
        const nsbqETB = (nvActive > 0) ? (tETB / nvActive).toFixed(2) : '0.00';
        let ketQua = `${quanLy} ngày ${ngayHienThi}\n🔥${danhSachNhanVien.length} FOS – ${tMC} MC\n✅NTB: ${tNTB}\n✅NSBQ NTB: ${nsbqNTB}\n✅ETB: ${tETB}\n✅NSBQ ETB: ${nsbqETB}\n✅AE+: ${tAE}\n✅Pos: ${tPos}/${danhSachNhanVien.length * 3}\n\n⭐️Active ${nvActive}/${danhSachNhanVien.length}\n${dsChiTiet.join('\n')}`;
        $('#vung-ket-qua-bao-cao').val(ketQua);
        
        if (!chiXem) {
            const thongKe = { tongFOS: danhSachNhanVien.length, tongMC: tMC, tongNTB: tNTB, nsbqNTB, tongETB: tETB, nsbqETB, tongPosThucHien: tPos, posChiTieu: danhSachNhanVien.length * 3, activeFOS: nvActive, tongAEPlus: tAE };
            luuBaoCaoLenServer(taoCauTrucGuiBaoCao(danhSachNhanVien, baoCaoLichSuGanNhat, thongKe), true);
        }
    };

    // --- SỰ KIỆN GIAO DIỆN ---
    $('body').on('click', '.lua-chon-giao-dien', function(e) {
        e.preventDefault();
        const theme = $(this).data('theme');
        const mode = $(this).data('mode');
        const lop = `theme-${theme}-${mode}`;
        apDungGiaoDien(lop); 
        luuCauHinhGiaoDien(lop);
        hienThiThongBao(`Giao diện: ${theme} ${mode}`);
    });

    $('#nut-giao-dien-ngau-nhien').on('click', e => { 
        e.preventDefault(); 
        luuCauHinhGiaoDien('random'); 
        apDungGiaoDienNgauNhien(); 
    });

    $('#nut-luu-nv-moi').on('click', async () => {
        const ten = $('#ten-nv-modal').val().trim(), gt = $('#gioi-tinh-nv-modal').val(), ct = parseInt($('#chi-tieu-nv-modal').val()) || 0;
        if (ten && !danhSachNhanVien.some(n => n.ten.toLowerCase() === ten.toLowerCase())) {
            hienThiTaiTrang("Đang lưu nhân viên...");
            try { await thucHienGoiApi('nhanvien', 'POST', { Ten: ten, GioiTinh: gt, ChiTieu: ct }); modalThemNv.hide(); taiDuLieuTuServer(); }
            catch (e) { hienThiThongBao(e.message, 'error'); } finally { anTaiTrang(); }
        }
    });

    $vungDsNv.on('click', '.nut-xoa-nv-kich-hoat', function() {
        nhanVienCanXoa = { id: $(this).data('nv-id'), ten: $(this).data('nv-ten') };
        $('#noi-dung-xac-nhan-xoa').text(`Xoá nhân viên "${nhanVienCanXoa.ten}"?`);
        modalXacNhanXoa.show();
    });

    $('#nut-xac-nhan-xoa-vinh-vien').on('click', async () => {
        if (!nhanVienCanXoa) return;
        hienThiTaiTrang("Đang xoá vĩnh viễn...");
        try { await thucHienGoiApi(`nhanvien/${nhanVienCanXoa.id}`, 'DELETE'); taiDuLieuTuServer(); }
        catch (e) { hienThiThongBao(e.message, 'error'); } finally { anTaiTrang(); modalXacNhanXoa.hide(); }
    });

    $vungDsNv.on('click', '.nut-ten-nv', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) { 
            $('#modalDanBaoCaoLabel').text(`Báo cáo của ${nhanVienHienTai}`); 
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

    $('#nut-xac-nhan-off-co-ly-do').on('click', () => {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) { nv.baoCao = `Fos ${nv.ten} ${$('#ly-do-off-nhap').val().trim() || 'OFF'}`; nv.trangThai = 'Off'; hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalDanBaoCao.hide(); }
    });

    $vungDsNv.on('click', '.nut-sua-nhanh-nv', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            const bc = nv.baoCao;
            $('#tieu-de-modal-sua-bao-cao').text(`Sửa nhanh: ${nhanVienHienTai}`);
            $('#ntb-sua').val(trichXuatSoLieu(bc, 'NTB')); $('#etb-sua').val(trichXuatSoLieu(bc, 'ETB'));
            $('#pos-sua').val(trichXuatSoLieu(bc, 'Pos')); $('#aeplus-sua').val(trichXuatSoLieu(bc, ['AE+', 'AE Plus']));
            $('#mtd-sua').val(trichXuatSoLieu(bc, 'MTD MC'));
            modalSuaBaoCao.show();
        }
    });

    $('#nut-xac-nhan-sua-bao-cao').on('click', () => {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            const n = parseInt($('#ntb-sua').val()) || 0, e = parseInt($('#etb-sua').val()) || 0;
            nv.baoCao = `Fos ${nv.ten}\nTổng MC: ${n+e}\nNTB: ${n}\nETB: ${e}\nAE+: ${$('#aeplus-sua').val() || 0}\nPos: ${$('#pos-sua').val() || 0}\nMTD MC: ${$('#mtd-sua').val() || 0}`;
            nv.trangThai = 'Đã báo cáo'; hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalSuaBaoCao.hide();
        }
    });

    $('#nut-dan-tu-bo-nho').on('click', async () => {
        try { const t = await navigator.clipboard.readText(); if (t) $('#noi-dung-bao-cao-nhap').val(t); } catch(e) {}
    });

    $('#nut-dan-hang-loat').on('click', async () => {
        try { const t = await navigator.clipboard.readText(); if (t) $('#noi-dung-nhieu-bao-cao-nhap').val(t); } catch(e) {}
    });

    $('#nut-xu-ly-nhieu-bao-cao').on('click', () => {
        const vanBan = $('#noi-dung-nhieu-bao-cao-nhap').val().trim();
        if (!vanBan) return;
        const khoiBaoCao = vanBan.split(/(?=^Fos\s)/im); 
        khoiBaoCao.forEach(khoi => {
            const khoiTrim = khoi.trim();
            const nv = danhSachNhanVien.find(n => {
                const tenEscape = n.ten.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                return new RegExp(`^Fos\\s+${tenEscape}(?=\\s|$)`, 'i').test(khoiTrim);
            });
            if (nv) { nv.baoCao = khoiTrim; nv.trangThai = 'Đã báo cáo'; kiemTraTenTrongBaoCao(nv, khoiTrim); }
        });
        modalDanNhieuBaoCao.hide(); hienThiDanhSachNhanVien(); luuVaoBoNhoTam();
        hienThiThongBao("Đã xử lý xong báo cáo hàng loạt.");
    });

    $('#nut-tao-bao-cao').on('click', () => thucHienTaoBaoCao());
    $('#nut-sao-chep').on('click', function() {
        const $btn = $(this);
        navigator.clipboard.writeText($('#vung-ket-qua-bao-cao').val()).then(() => {
            hienThiThongBao('Đã sao chép báo cáo vào bộ nhớ tạm!');
            $btn.html('<i class="fa-solid fa-check"></i> Đã chép').addClass('btn-success').removeClass('btn-primary');
            setTimeout(() => $btn.html('<i class="fa-regular fa-copy"></i> Sao chép').removeClass('btn-success').addClass('btn-primary'), 2000);
        });
    });
    $('#nut-xem-bao-cao-cu').on('click', () => modalXemBaoCaoCu.show());
    
    // KHỞI CHẠY
    khoiTaoGiaoDien(); 
    xayDungMenuGiaoDien(); 
    taiDuLieuTuServer(); 
});
