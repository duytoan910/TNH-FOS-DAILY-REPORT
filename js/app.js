import { KHOA_BO_NHO_TAM_CUC_BO } from './config.js';
import { hienThiThongBao, hienThiTaiTrang, anTaiTrang, dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu } from './utils.js';
import { khoiTaoGiaoDien, xayDungMenuGiaoDien, apDungGiaoDien, luuCauHinhGiaoDien, apDungGiaoDienNgauNhien } from './theme.js';
import { thucHienGoiApi, ghiNhanTuongTacApi, lamMoiThongKeCsdl, datCheDoUngDung, layCheDoUngDung } from './api.js';
import { kiemTraTenTrongBaoCao, kiemTraChiSoMtd, taoCauTrucGuiBaoCao } from './report.js';

$(function() {
    // --- TRẠNG THÁI ỨNG DỤNG ---
    let danhSachNhanVien = []; 
    let baoCaoLichSuGanNhat = null; // Báo cáo ngày gần nhất TRƯỚC HÔM NAY
    let ngayBaoCaoLichSu = null; 
    let nhanVienHienTai = null;
    let nhanVienCanXoa = null;
    
    // --- HÀM HỖ TRỢ GIAO DIỆN ---
    const capNhatWidgetDb = (trucTuyen, slNv, slBaoCao, slTruyCap) => {
        const $cham = $('#cham-trang-thai-db');
        const $chu = $('#chu-trang-thai-db');
        const $nv = $('#so-luong-nv-db');
        const $bc = $('#so-luong-bao-cao-db');
        const $luong = $('#luong-truy-cap-api');
        
        if (trucTuyen) {
            $cham.removeClass('offline').addClass('online');
            $chu.text('Đã kết nối DB');
        } else {
            $cham.removeClass('online').addClass('offline');
            $chu.text('Chế độ Offline');
        }
        if (slNv !== null) $nv.text(`NV: ${slNv}`);
        if (slBaoCao !== null) $bc.text(`Rpt: ${slBaoCao}`);
        if (slTruyCap !== null) {
            $luong.text(`(${slTruyCap})`);
            $luong.removeClass('text-danger fw-bold').addClass('text-muted');
        }
    }

    const $vungDsNv = $('#vung-danh-sach-nv');
    const modalThemNv = new bootstrap.Modal('#modalThemNhanVien');
    const modalDanBaoCao = new bootstrap.Modal('#modalDanBaoCao');
    const modalSuaBaoCao = new bootstrap.Modal('#modalSuaBaoCao');
    const modalDanNhieuBaoCao = new bootstrap.Modal('#modalDanNhieuBaoCao');
    const modalXacNhanXoa = new bootstrap.Modal('#modalXacNhanXoa');
    const modalXemBaoCaoCu = new bootstrap.Modal('#modalXemBaoCaoCu');
    
    const capNhatNutTaoBaoCao = () => {
        const daBaoCao = danhSachNhanVien.filter(nv => nv.trangThai !== 'Chưa báo cáo').length;
        const tongSo = danhSachNhanVien.length;
        $('#nut-tao-bao-cao').html(`Tạo & Lưu Báo Cáo (${daBaoCao}/${tongSo})`);
    };

    const hienThiDanhSachNhanVien = () => {
        if (danhSachNhanVien.length === 0) {
             $vungDsNv.html('<div class="text-center py-3 text-muted">Danh sách trống. Vui lòng thêm nhân viên.</div>');
             capNhatNutTaoBaoCao();
             return;
        }
        
        let html = '<div class="row g-2">';
        danhSachNhanVien.forEach(nv => {
            let lopNut = '';
            if (nv.kiemTraTen === false) {
                lopNut = 'name-mismatch';
            } else if (nv.trangThai === 'Đã báo cáo') {
                lopNut = 'reported';
            } else if (nv.trangThai === 'Off') {
                lopNut = 'off';
            }

            html += `
                <div class="col-6">
                    <div class="input-group">
                        <button class="btn fos-name-btn ${lopNut}" data-nv-id="${nv._id}" data-nv-ten="${nv.ten}">
                            ${nv.ten}
                        </button>
                        <button class="btn edit-fos-btn nut-sua-nhanh-nv" data-nv-ten="${nv.ten}" title="Sửa báo cáo của ${nv.ten}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn delete-fos-btn nut-xoa-nv" data-nv-id="${nv._id}" data-nv-ten="${nv.ten}" title="Xóa ${nv.ten}">
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

    // --- LƯU TRỮ CỤC BỘ ---
    const luuVaoBoNhoTam = () => {
        const homNayStr = dinhDangNgayISO(new Date());
        const duLieu = {
            ngay: homNayStr,
            duLieuNv: danhSachNhanVien.map(n => ({
                _id: n._id,
                baoCao: n.baoCao,
                trangThai: n.trangThai,
                kiemTraTen: n.kiemTraTen
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
            const homNayStr = dinhDangNgayISO(new Date());
            
            if (duLieu.ngay !== homNayStr) {
                localStorage.removeItem(KHOA_BO_NHO_TAM_CUC_BO);
                return false;
            }
            
            let soLuongKhoiPhu = 0;
            duLieu.duLieuNv.forEach(itemTam => {
                const nv = danhSachNhanVien.find(n => n._id === itemTam._id);
                if (nv && itemTam.baoCao) {
                    nv.baoCao = itemTam.baoCao;
                    nv.trangThai = itemTam.trangThai;
                    nv.kiemTraTen = itemTam.kiemTraTen;
                    soLuongKhoiPhu++;
                }
            });
            
            if (soLuongKhoiPhu > 0) {
                hienThiDanhSachNhanVien();
                if(duLieu.vanBanKetQua) {
                     $('#vung-ket-qua-bao-cao').val(duLieu.vanBanKetQua);
                     kiemTraChiSoMtd(danhSachNhanVien, baoCaoLichSuGanNhat, ngayBaoCaoLichSu);
                } else {
                     thucHienTaoBaoCao(null, true);
                }
                hienThiThongBao(`Đã khôi phục ${soLuongKhoiPhu} báo cáo từ bộ nhớ tạm.`, 'info');
                return true;
            }
        } catch (e) {
            console.error("Lỗi khôi phục cache", e);
            localStorage.removeItem(KHOA_BO_NHO_TAM_CUC_BO);
        }
        return false;
    };

    // --- TẢI DỮ LIỆU ---
    const taiDuLieuTuServer = async () => {
        hienThiTaiTrang("Đang tải dữ liệu hệ thống...");
        try {
            await ghiNhanTuongTacApi();
            const duLieuGốc = await thucHienGoiApi('nhanvien?h={"$orderby": {"Ten": 1}}');
            datCheDoUngDung('online');
            
            danhSachNhanVien = duLieuGốc.map(item => ({
                _id: item._id,
                ten: item.Ten,
                gioiTinh: item.GioiTinh,
                chiTieu: parseInt(item.ChiTieu, 10) || 50,
                baoCao: '',
                trangThai: 'Chưa báo cáo',
                kiemTraTen: null
            }));
            hienThiDanhSachNhanVien();
            khoiPhuTuBoNhoTam();
            anTaiTrang();

            $('#chi-bao-dang-luu').css('display', 'flex').find('span').text('Đang đồng bộ...');
            lamMoiThongKeCsdl(capNhatWidgetDb);
            await khoiPhuPhienLamViec();

        } catch (error) {
            console.warn("Dữ liệu dự phòng", error);
            datCheDoUngDung('offline');
            capNhatWidgetDb(false, null, null);
            
            try {
                const phanHoi = await fetch('fos.txt');
                const text = await phanHoi.text();
                danhSachNhanVien = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map((line, index) => {
                        const parts = line.split('|');
                        return {
                            _id: `local_${index}`, ten: parts[0]?.trim() || 'Vô danh',
                            gioiTinh: parts[1]?.trim() || 'Nam', chiTieu: parseInt(parts[2]?.trim() || '50', 10),
                            baoCao: '', trangThai: 'Chưa báo cáo', kiemTraTen: null
                        };
                    });
                hienThiDanhSachNhanVien();
                khoiPhuTuBoNhoTam();
            } catch (fileErr) {
                 $vungDsNv.html('<div class="text-center py-3 text-danger">Lỗi kết nối</div>');
            }
        } finally {
            anTaiTrang(); 
            $('#chi-bao-dang-luu').hide().find('span').text('Đang lưu...');
        }
    };

    const khoiPhuPhienLamViec = async () => {
        const homNayStr = dinhDangNgayISO(new Date());

        try {
            const bcHomNay = await thucHienGoiApi(`report?q={"ngayBaoCao": "${homNayStr}"}`);
            if (bcHomNay.length > 0) {
                const baoCao = bcHomNay[0];
                let soNvKhoiPhu = 0;
                
                baoCao.baoCaoFOS.forEach(item => {
                    const nv = danhSachNhanVien.find(n => n.ten === item.tenNhanVien);
                    if (nv && nv.baoCao === '') {
                        if (item.OFF === 0 || item.OFF === '0') {
                            nv.trangThai = 'Đã báo cáo';
                            nv.baoCao = item.rawReport || `Fos ${item.tenNhanVien}\nTổng MC: ${item.chiSoHieuSuat.saleHomNay}\nMTD MC: ${item.chiSoHieuSuat.saleTrongThang}`;
                        } else {
                            nv.trangThai = 'Off';
                            const lyDo = (item.OFF === 1 || item.OFF === '1') ? 'OFF' : item.OFF;
                            nv.baoCao = `Fos ${item.tenNhanVien} ${lyDo}`;
                        }
                        soNvKhoiPhu++;
                    }
                });
                
                if (soNvKhoiPhu > 0) {
                    hienThiThongBao(`Đã đồng bộ ${soNvKhoiPhu} báo cáo hôm nay.`, 'info');
                    hienThiDanhSachNhanVien();
                }
            }
        } catch (e) { console.warn("Lỗi khôi phục phiên hôm nay", e); }

        try {
            const truyVanLichSu = `{"ngayBaoCao": {"$lt": "${homNayStr}"}}`;
            const sapXepLichSu = `{"$orderby": {"ngayBaoCao": -1}}`;
            const dsBcCu = await thucHienGoiApi(`report?q=${truyVanLichSu}&h=${sapXepLichSu}&max=1`);
            
            if (dsBcCu.length > 0) {
                baoCaoLichSuGanNhat = dsBcCu[0];
                ngayBaoCaoLichSu = baoCaoLichSuGanNhat.ngayBaoCao;
                const ngayHienThi = dinhDangNgayHienThi(ngayBaoCaoLichSu);

                baoCaoLichSuGanNhat.duLieuNvLichSu = baoCaoLichSuGanNhat.baoCaoFOS.map(item => ({
                    ten: item.tenNhanVien,
                    mtdMC: item.chiSoHieuSuat.saleTrongThang
                }));
                
                let textBcCu = `Dữ liệu ngày ${ngayHienThi} (Lịch sử gần nhất):\n`;
                baoCaoLichSuGanNhat.duLieuNvLichSu.forEach(n => {
                     textBcCu += `${n.ten}: MTD ${n.mtdMC || 0}\n`;
                });
                $('#vung-ket-qua-bao-cao-cu').val(textBcCu);
                thucHienTaoBaoCao(null, true);
            }
        } catch (e) { console.warn("Lỗi tải lịch sử", e); }
    };

    const luuBaoCaoLenServer = async (cauTruc, chayNgam = false) => {
        if (layCheDoUngDung() === 'offline') {
            hienThiThongBao("Đã lưu cục bộ.", "info");
            return;
        }

        if (chayNgam) $('#chi-bao-dang-luu').css('display', 'flex'); else hienThiTaiTrang("Đang lưu...");

        try {
            const kiemTra = await thucHienGoiApi(`report?q={"ngayBaoCao": "${cauTruc.ngayBaoCao}"}`);
            if (kiemTra.length > 0) {
                await thucHienGoiApi(`report/${kiemTra[0]._id}`, 'PUT', cauTruc);
                hienThiThongBao("Đã cập nhật báo cáo!");
            } else {
                await thucHienGoiApi('report', 'POST', cauTruc);
                hienThiThongBao("Đã tạo báo cáo mới!");
            }
            lamMoiThongKeCsdl(capNhatWidgetDb);
        } catch (error) {
            hienThiThongBao(`Lỗi: ${error.message}`, 'error');
        } finally {
            if (chayNgam) $('#chi-bao-dang-luu').hide(); else anTaiTrang();
        }
    };
    
    const thucHienTaoBaoCao = (e, chiXem = false) => {
        danhSachNhanVien.sort((a, b) => b.chiTieu - a.chiTieu);
        hienThiDanhSachNhanVien();

        const quanLy = 'TNH';
        const ngayHienThi = dinhDangNgayHienThi(new Date());
        
        let tMC = 0, tNTB = 0, tETB = 0, nvActive = 0, tPos = 0, tAE = 0;
        const chiTieuPos = danhSachNhanVien.length * 3;
        let dsChiTiet = [];
        
        const banDoLichSu = new Map();
        if (baoCaoLichSuGanNhat && baoCaoLichSuGanNhat.duLieuNvLichSu) {
            baoCaoLichSuGanNhat.duLieuNvLichSu.forEach(n => banDoLichSu.set(n.ten, n));
        }

        danhSachNhanVien.forEach(nv => {
            const bieuTuong = nv.gioiTinh === 'Nữ' ? '👵' : '👨';
            const bc = nv.baoCao;
            
            let mtd = trichXuatSoLieu(bc, 'MTD MC');
            let ntb = trichXuatSoLieu(bc, 'NTB'), etb = trichXuatSoLieu(bc, 'ETB');
            let mcNay = ntb + etb;
            if (mcNay === 0) mcNay = trichXuatSoLieu(bc, ['Tổng MC', 'MC']);

            // Ưu tiên mốc lịch sử (trước hôm nay) nếu OFF hoặc 0 Sale mà không nhập mtd mới
            if ((nv.trangThai === 'Off' || mcNay === 0) && mtd === 0) {
                const nvLichSu = banDoLichSu.get(nv.ten);
                mtd = nvLichSu ? (nvLichSu.mtdMC || 0) : 0;
            }

            if (nv.trangThai === 'Off') {
                const matchLyDo = bc.match(/^Fos\s+\S+\s+(.*)$/i);
                const lyDo = (matchLyDo && matchLyDo[1] && matchLyDo[1].toUpperCase() !== 'OFF') ? matchLyDo[1] : 'OFF';
                dsChiTiet.push(`${bieuTuong}${nv.ten}: ${lyDo}/${mtd}/${nv.chiTieu}`);
            } else {
                nvActive++;
                const pos = trichXuatSoLieu(bc, 'Pos'), ae = trichXuatSoLieu(bc, ['AE+', 'AE Plus']);
                tMC += mcNay; tNTB += ntb; tETB += etb; tPos += pos; tAE += ae;
                dsChiTiet.push(`${bieuTuong}${nv.ten}: ${mcNay}/${mtd}/${nv.chiTieu}`);
            }
        });

        const nsbqNTB = (nvActive > 0) ? (tNTB / nvActive).toFixed(2) : '0.00';
        const nsbqETB = (nvActive > 0) ? (tETB / nvActive).toFixed(2) : '0.00';

        let ketQua = `${quanLy} ngày ${ngayHienThi}\n`;
        ketQua += `🔥${danhSachNhanVien.length} FOS – ${tMC} MC\n✅NTB: ${tNTB}\n✅NSBQ NTB: ${nsbqNTB}\n✅ETB: ${tETB}\n✅NSBQ ETB: ${nsbqETB}\n✅AE+: ${tAE}\n✅Pos: ${tPos}/${chiTieuPos}\n\n`;
        ketQua += `⭐️Active ${nvActive}/${danhSachNhanVien.length}\n${dsChiTiet.join('\n')}`;

        $('#vung-ket-qua-bao-cao').val(ketQua);
        kiemTraChiSoMtd(danhSachNhanVien, baoCaoLichSuGanNhat, ngayBaoCaoLichSu);

        if (!chiXem) {
            const thongKe = { tongFOS: danhSachNhanVien.length, tongMC: tMC, tongNTB: tNTB, nsbqNTB, tongETB: tETB, nsbqETB, tongPosThucHien: tPos, posChiTieu: chiTieuPos, activeFOS: nvActive, tongAEPlus: tAE };
            const cauTruc = taoCauTrucGuiBaoCao(danhSachNhanVien, baoCaoLichSuGanNhat, thongKe);
            luuBaoCaoLenServer(cauTruc, true);
        }
    };

    // --- SỰ KIỆN GIAO DIỆN ---
    $('#menu-giao-dien-chon').on('click', '.lua-chon-giao-dien', function(e) {
        e.preventDefault();
        const lop = `theme-${$(this).data('theme')}-${$(this).data('mode')}`;
        apDungGiaoDien(lop); luuCauHinhGiaoDien(lop);
    });
    $('#nut-giao-dien-ngau-nhien').on('click', e => { e.preventDefault(); luuCauHinhGiaoDien('random'); apDungGiaoDienNgauNhien(); });

    $('#nut-luu-nv-moi').on('click', async () => {
        const ten = $('#ten-nv-modal').val().trim(), gt = $('#gioi-tinh-nv-modal').val(), ct = parseInt($('#chi-tieu-nv-modal').val()) || 0;
        if (ten && !danhSachNhanVien.some(n => n.ten.toLowerCase() === ten.toLowerCase())) {
            if (layCheDoUngDung() === 'offline') {
                 danhSachNhanVien.push({ _id: `local_${Date.now()}`, ten, gioiTinh: gt, chiTieu: ct, baoCao: '', trangThai: 'Chưa báo cáo', kiemTraTen: null });
                 modalThemNv.hide(); hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); return;
            }
            hienThiTaiTrang();
            try { await thucHienGoiApi('nhanvien', 'POST', { Ten: ten, GioiTinh: gt, ChiTieu: ct }); modalThemNv.hide(); taiDuLieuTuServer(); }
            catch (e) { hienThiThongBao(e.message, 'error'); } finally { anTaiTrang(); }
        }
    });
    
    $vungDsNv.on('click', '.nut-xoa-nv', function() {
        nhanVienCanXoa = { id: $(this).data('nv-id'), ten: $(this).data('nv-ten') };
        $('#noi-dung-xac-nhan-xoa').text(`Xoá nhân viên "${nhanVienCanXoa.ten}"?`);
        modalXacNhanXoa.show();
    });

    $('#nut-xac-nhan-xoa-vinh-vien').on('click', async () => {
        if (nhanVienCanXoa) {
             if (layCheDoUngDung() === 'offline') {
                 danhSachNhanVien = danhSachNhanVien.filter(n => n._id !== nhanVienCanXoa.id);
                 hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalXacNhanXoa.hide(); return;
             }
            hienThiTaiTrang();
            try { await thucHienGoiApi(`nhanvien/${nhanVienCanXoa.id}`, 'DELETE'); taiDuLieuTuServer(); }
            catch (e) { hienThiThongBao(e.message, 'error'); } finally { anTaiTrang(); }
        }
        modalXacNhanXoa.hide();
    });
    
    $vungDsNv.on('click', '.fos-name-btn', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) { $('#modalDanBaoCaoLabel').text(`Báo cáo của ${nhanVienHienTai}`); $('#noi-dung-bao-cao-nhap').val(nv.baoCao); modalDanBaoCao.show(); }
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

    $('#nut-tao-bao-cao').on('click', () => thucHienTaoBaoCao());
    $('#nut-sao-chep').on('click', () => {
        navigator.clipboard.writeText($('#vung-ket-qua-bao-cao').val()).then(() => hienThiThongBao('Đã chép!'));
    });
    $('#nut-xem-bao-cao-cu').on('click', () => modalXemBaoCaoCu.show());
    
    khoiTaoGiaoDien(); xayDungMenuGiaoDien(); taiDuLieuTuServer(); 
});