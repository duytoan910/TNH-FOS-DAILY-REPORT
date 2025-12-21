import { KHOA_BO_NHO_TAM_CUC_BO } from './config.js';
import { hienThiThongBao, hienThiTaiTrang, anTaiTrang, dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu } from './utils.js';
import { khoiTaoGiaoDien, xayDungMenuGiaoDien, apDungGiaoDien, luuCauHinhGiaoDien, apDungGiaoDienNgauNhien } from './theme.js';
import { thucHienGoiApi, ghiNhanTuongTacApi, lamMoiThongKeCsdl, datCheDoUngDung, layCheDoUngDung } from './api.js';
import { kiemTraTenTrongBaoCao, kiemTraChiSoMtd, taoCauTrucGuiBaoCao } from './report.js';

$(function() {
    // --- TRẠNG THÁI ỨNG DỤNG ---
    let danhSachNhanVien = []; 
    let baoCaoLichSuGanNhat = null; // Luôn là báo cáo của ngày < hôm nay
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
            console.warn("RestDB lỗi, chuyển sang dữ liệu dự phòng", error);
            datCheDoUngDung('offline');
            capNhatWidgetDb(false, null, null);
            
            try {
                const phanHoi = await fetch('fos.txt');
                if (!phanHoi.ok) throw new Error("Không tìm thấy file dự phòng");
                const text = await phanHoi.text();
                danhSachNhanVien = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map((line, index) => {
                        const parts = line.split('|');
                        return {
                            _id: `local_${index}`,
                            ten: parts[0]?.trim() || 'Vô danh',
                            gioiTinh: parts[1]?.trim() || 'Nam',
                            chiTieu: parseInt(parts[2]?.trim() || '50', 10),
                            baoCao: '',
                            trangThai: 'Chưa báo cáo',
                            kiemTraTen: null
                        };
                    });
                
                hienThiThongBao("Chế độ Offline: Đã tải dữ liệu dự phòng.", "info");
                hienThiDanhSachNhanVien();
                khoiPhuTuBoNhoTam();
            } catch (fileErr) {
                 $vungDsNv.html('<div class="text-center py-3 text-danger"><i class="fa-solid fa-triangle-exclamation me-1"></i>Lỗi kết nối & Không có dữ liệu</div>');
                 hienThiThongBao("Lỗi tải dữ liệu: " + error.message, "error");
            }
        } finally {
            anTaiTrang(); 
            $('#chi-bao-dang-luu').hide().find('span').text('Đang lưu...');
        }
    };

    const khoiPhuPhienLamViec = async () => {
        const homNayStr = dinhDangNgayISO(new Date());

        // 1. Khôi phục dữ liệu đã nhập trong hôm nay (nếu có)
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
                    hienThiThongBao(`Đã đồng bộ ${soNvKhoiPhu} báo cáo từ server.`, 'info');
                    hienThiDanhSachNhanVien();
                }
            }
        } catch (e) { console.warn("Không thể khôi phục phiên hôm nay", e); }

        // 2. Tải báo cáo của ngày gần nhất TRƯỚC HÔM NAY để làm mốc MTD
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
                
                // Sau khi có dữ liệu lịch sử, chạy tính toán lại báo cáo để điền MTD tự động
                thucHienTaoBaoCao(null, true);
            }
        } catch (e) { console.warn("Không tìm thấy báo cáo lịch sử", e); }
    };

    const luuBaoCaoLenServer = async (cauTruc, chayNgam = false) => {
        if (layCheDoUngDung() === 'offline') {
            hienThiThongBao("Chế độ Offline: Đã lưu báo cáo cục bộ.", "info");
            return;
        }

        if (chayNgam) {
            $('#chi-bao-dang-luu').css('display', 'flex');
        } else {
            hienThiTaiTrang("Đang lưu báo cáo lên Server...");
        }

        try {
            const kiemTra = await thucHienGoiApi(`report?q={"ngayBaoCao": "${cauTruc.ngayBaoCao}"}`);
            if (kiemTra.length > 0) {
                await thucHienGoiApi(`report/${kiemTra[0]._id}`, 'PUT', cauTruc);
                hienThiThongBao("Đã cập nhật báo cáo thành công!");
            } else {
                await thucHienGoiApi('report', 'POST', cauTruc);
                hienThiThongBao("Đã tạo mới báo cáo thành công!");
            }
            lamMoiThongKeCsdl(capNhatWidgetDb);
        } catch (error) {
            hienThiThongBao(`Lỗi khi lưu báo cáo: ${error.message}`, 'error');
        } finally {
            if (chayNgam) $('#chi-bao-dang-luu').hide(); else anTaiTrang();
        }
    };
    
    // --- LOGIC CHÍNH ---
    const xuLyBaoCaoHangLoat = () => {
        const vanBan = $('#noi-dung-nhieu-bao-cao-nhap').val().trim();
        if (!vanBan) {
            hienThiThongBao('Vui lòng dán nội dung báo cáo.', 'error');
            return;
        }
        const khoiBaoCao = vanBan.split(/(?=^Fos\s)/im); 
        let slThanhCong = 0;
        let dsTenLoi = [];
        const dsTenDaCapNhat = new Set();

        khoiBaoCao.forEach(khoi => {
            const khoiTrim = khoi.trim();
            if (khoiTrim.length === 0) return;
            const matchTen = khoiTrim.match(/^Fos\s+([^\s]+)/i);
            const tenTrongBc = matchTen ? matchTen[1] : null;

            let nvTimThay = danhSachNhanVien.find(n => {
                const tenEscape = n.ten.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regexTen = new RegExp(`^Fos\\s+${tenEscape}(?=\\s|$)`, 'i');
                return regexTen.test(khoiTrim);
            });
            
            if (nvTimThay) {
                nvTimThay.baoCao = khoiTrim;
                nvTimThay.trangThai = 'Đã báo cáo';
                kiemTraTenTrongBaoCao(nvTimThay, khoiTrim);
                if (!dsTenDaCapNhat.has(nvTimThay.ten)) {
                    slThanhCong++;
                    dsTenDaCapNhat.add(nvTimThay.ten);
                }
            } else if (tenTrongBc) {
                 dsTenLoi.push(tenTrongBc);
            }
        });

        modalDanNhieuBaoCao.hide();
        hienThiDanhSachNhanVien();
        luuVaoBoNhoTam(); 
        
        let thongBao = `Xử lý hoàn tất!<br>- Thành công: ${slThanhCong} NV.`;
        if (dsTenLoi.length > 0) {
            const tenDuyNhat = [...new Set(dsTenLoi)];
            thongBao += `<br>- Lỗi tên: ${tenDuyNhat.join(', ')}.`;
        }
        hienThiThongBao(thongBao, dsTenLoi.length > 0 ? 'info' : 'success');
        $('#noi-dung-nhieu-bao-cao-nhap').val('');
    };

    const thucHienTaoBaoCao = (e, chiXem = false) => {
        danhSachNhanVien.sort((a, b) => b.chiTieu - a.chiTieu);
        hienThiDanhSachNhanVien();

        const quanLy = 'TNH';
        const ngayHienThi = dinhDangNgayHienThi(new Date());
        
        let tongNv = danhSachNhanVien.length;
        let tMC = 0, tNTB = 0, tETB = 0, nvActive = 0, tPos = 0, tAE = 0;
        const chiTieuPos = tongNv * 3;
        let dsChiTiet = [];
        
        const banDoLichSu = new Map();
        if (baoCaoLichSuGanNhat && baoCaoLichSuGanNhat.duLieuNvLichSu) {
            baoCaoLichSuGanNhat.duLieuNvLichSu.forEach(n => banDoLichSu.set(n.ten, n));
        }

        danhSachNhanVien.forEach(nv => {
            const bieuTuong = nv.gioiTinh === 'Nữ' ? '👵' : '👨';
            const bc = nv.baoCao;
            const mucTieu = nv.chiTieu || 0;
            
            let mtd = trichXuatSoLieu(bc, 'MTD MC');
            let ntb = trichXuatSoLieu(bc, 'NTB');
            let etb = trichXuatSoLieu(bc, 'ETB');
            let mcNay = ntb + etb;
            if (mcNay === 0) mcNay = trichXuatSoLieu(bc, ['Tổng MC', 'MC']);

            // LOGIC MTD: Nếu OFF hoặc 0 SALE và người dùng KHÔNG nhập MTD mới (mtd === 0)
            if ((nv.trangThai === 'Off' || mcNay === 0) && mtd === 0) {
                const nvLichSu = banDoLichSu.get(nv.ten);
                mtd = nvLichSu ? (nvLichSu.mtdMC || 0) : 0;
            }

            if (nv.trangThai === 'Off') {
                const matchLyDo = bc.match(/^Fos\s+\S+\s+(.*)$/i);
                const lyDo = (matchLyDo && matchLyDo[1] && matchLyDo[1].toUpperCase() !== 'OFF') ? matchLyDo[1] : 'OFF';
                dsChiTiet.push(`${bieuTuong}${nv.ten}: ${lyDo}/${mtd}/${mucTieu}`);
            } else {
                nvActive++;
                const pos = trichXuatSoLieu(bc, 'Pos');
                const ae = trichXuatSoLieu(bc, ['AE+', 'AE Plus']);
                
                tMC += mcNay; tNTB += ntb; tETB += etb; tPos += pos; tAE += ae;
                dsChiTiet.push(`${bieuTuong}${nv.ten}: ${mcNay}/${mtd}/${mucTieu}`);
            }
        });

        const nsbqNTB = (nvActive > 0) ? (tNTB / nvActive).toFixed(2) : '0.00';
        const nsbqETB = (nvActive > 0) ? (tETB / nvActive).toFixed(2) : '0.00';

        let ketQua = `${quanLy} ngày ${ngayHienThi}\n`;
        ketQua += `🔥${tongNv} FOS – ${tMC} MC\n✅NTB: ${tNTB}\n✅NSBQ NTB: ${nsbqNTB}\n✅ETB: ${tETB}\n✅NSBQ ETB: ${nsbqETB}\n✅AE+: ${tAE}\n✅Pos: ${tPos}/${chiTieuPos}\n\n`;
        ketQua += `⭐️Active ${nvActive}/${tongNv}\n${dsChiTiet.join('\n')}`;

        $('#vung-ket-qua-bao-cao').val(ketQua);
        
        // Luôn kiểm tra với dữ liệu lịch sử (không tính hôm nay)
        kiemTraChiSoMtd(danhSachNhanVien, baoCaoLichSuGanNhat, ngayBaoCaoLichSu);

        if (!chiXem) {
            const thongKe = {
                tongFOS: tongNv, tongMC: tMC, tongNTB: tNTB, nsbqNTB, tongETB: tETB, nsbqETB, tongPosThucHien: tPos, posChiTieu: chiTieuPos, activeFOS: nvActive, tongAEPlus: tAE
            };
            const cauTruc = taoCauTrucGuiBaoCao(danhSachNhanVien, baoCaoLichSuGanNhat, thongKe);
            luuBaoCaoLenServer(cauTruc, true);
        }
    };

    // --- SỰ KIỆN ---
    $('#menu-giao-dien').on('click', '.lua-chon-giao-dien', function(e) {
        e.preventDefault();
        const th = $(this).data('theme');
        const mo = $(this).data('mode');
        const lop = `theme-${th}-${mo}`;
        apDungGiaoDien(lop);
        luuCauHinhGiaoDien(lop);
    });
    $('#nut-giao-dien-ngau-nhien').on('click', function(e) {
        e.preventDefault();
        luuCauHinhGiaoDien('random');
        apDungGiaoDienNgauNhien();
    });

    $('#nut-luu-nv-moi').on('click', async function() {
        const ten = $('#ten-nv-modal').val().trim();
        const gt = $('#gioi-tinh-nv-modal').val();
        const ct = parseInt($('#chi-tieu-nv-modal').val(), 10) || 0;
        
        if (ten && !danhSachNhanVien.some(n => n.ten.toLowerCase() === ten.toLowerCase())) {
            if (layCheDoUngDung() === 'offline') {
                 danhSachNhanVien.push({ _id: `local_${Date.now()}`, ten, gioiTinh: gt, chiTieu: ct, baoCao: '', trangThai: 'Chưa báo cáo', kiemTraTen: null });
                 modalThemNv.hide(); $('#bieu-mau-them-nv')[0].reset(); hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); hienThiThongBao(`Đã thêm ${ten} (Offline)!`);
                 return;
            }
            hienThiTaiTrang("Đang thêm...");
            try {
                await thucHienGoiApi('nhanvien', 'POST', { Ten: ten, GioiTinh: gt, ChiTieu: ct });
                modalThemNv.hide(); $('#bieu-mau-them-nv')[0].reset(); hienThiThongBao(`Đã thêm ${ten} thành công!`); taiDuLieuTuServer();
            } catch (e) { hienThiThongBao("Lỗi: " + e.message, 'error'); } finally { anTaiTrang(); }
        } else { hienThiThongBao('Tên không hợp lệ hoặc đã tồn tại!', 'error'); }
    });
    
    $vungDsNv.on('click', '.nut-xoa-nv', function() {
        nhanVienCanXoa = { id: $(this).data('nv-id'), ten: $(this).data('nv-ten') };
        $('#noi-dung-xac-nhan-xoa').text(`Xoá nhân viên "${nhanVienCanXoa.ten}"?`);
        modalXacNhanXoa.show();
    });

    $('#nut-xac-nhan-xoa-vinh-vien').on('click', async function() {
        if (nhanVienCanXoa) {
             if (layCheDoUngDung() === 'offline') {
                 danhSachNhanVien = danhSachNhanVien.filter(n => n._id !== nhanVienCanXoa.id);
                 hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); hienThiThongBao(`Đã xoá ${nhanVienCanXoa.ten}!`);
                 modalXacNhanXoa.hide(); return;
             }
            hienThiTaiTrang("Đang xoá...");
            try { await thucHienGoiApi(`nhanvien/${nhanVienCanXoa.id}`, 'DELETE'); hienThiThongBao("Đã xoá!"); taiDuLieuTuServer(); }
            catch (e) { hienThiThongBao("Lỗi: " + e.message, 'error'); } finally { anTaiTrang(); }
        }
        modalXacNhanXoa.hide();
    });
    
    $vungDsNv.on('click', '.fos-name-btn', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) { $('#modalDanBaoCaoLabel').text(`Báo cáo của ${nhanVienHienTai}`); $('#noi-dung-bao-cao-nhap').val(nv.baoCao); modalDanBaoCao.show(); }
    });
    
    document.getElementById('modalDanBaoCao').addEventListener('shown.bs.modal', () => { $('#noi-dung-bao-cao-nhap').focus().select(); $('#ly-do-off-nhap').val(''); });

    $('#nut-luu-bao-cao-don').on('click', function() {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            const nd = $('#noi-dung-bao-cao-nhap').val();
            nv.baoCao = nd; nv.trangThai = 'Đã báo cáo'; kiemTraTenTrongBaoCao(nv, nd);
            hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalDanBaoCao.hide();
        }
    });
    
    $('#noi-dung-bao-cao-nhap').on('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#nut-luu-bao-cao-don').click(); } });

    const datNvNghi = (lyDo = '') => {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            nv.baoCao = `Fos ${nv.ten} ${lyDo.trim() || 'OFF'}`;
            nv.trangThai = 'Off'; nv.kiemTraTen = null;
            hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalDanBaoCao.hide();
        }
    }

    $('#nut-danh-dau-off').on('click', () => datNvNghi(''));
    $('#nut-xac-nhan-off-co-ly-do').on('click', () => datNvNghi($('#ly-do-off-nhap').val()));

    $vungDsNv.on('click', '.nut-sua-nhanh-nv', function() {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            $('#tieu-de-modal-sua-bao-cao').text(`Sửa báo cáo: ${nhanVienHienTai}`);
            const bc = nv.baoCao;
            const ntb = trichXuatSoLieu(bc, 'NTB'), etb = trichXuatSoLieu(bc, 'ETB');
            $('#hien-thi-mc-tong-sua').text(ntb + etb);
            $('#ntb-sua').val(ntb); $('#etb-sua').val(etb); $('#pos-sua').val(trichXuatSoLieu(bc, 'Pos'));
            $('#aeplus-sua').val(trichXuatSoLieu(bc, ['AE+', 'AE Plus']));
            $('#saleapp-sua').val(trichXuatSoLieu(bc, ['Saleapp', 'SL nhập saleapp']));
            $('#cskh-sua').val(trichXuatSoLieu(bc, ['CSKH', 'SL gọi chăm sóc KH']));
            $('#ca-sua').val(trichXuatSoLieu(bc, 'CA')); $('#soundbox-sua').val(trichXuatSoLieu(bc, 'Soundbox'));
            $('#mtd-sua').val(trichXuatSoLieu(bc, 'MTD MC'));
            modalSuaBaoCao.show();
        }
    });
    
    $('#nut-xu-ly-nhieu-bao-cao').on('click', xuLyBaoCaoHangLoat);
    $('#bieu-mau-sua-bao-cao').on('input', '#ntb-sua, #etb-sua', () => {
        $('#hien-thi-mc-tong-sua').text((parseInt($('#ntb-sua').val()) || 0) + (parseInt($('#etb-sua').val()) || 0));
    });

    $('#nut-xac-nhan-sua-bao-cao').on('click', function() {
        const nv = danhSachNhanVien.find(n => n.ten === nhanVienHienTai);
        if (nv) {
            const ntb = $('#ntb-sua').val() || 0, etb = $('#etb-sua').val() || 0;
            const mc = (parseInt(ntb) || 0) + (parseInt(etb) || 0);
            const ndMoi = `Fos ${nv.ten}\nTổng MC: ${mc}\nNTB: ${ntb}\nETB: ${etb}\nAE+: ${$('#aeplus-sua').val() || 0}\nPos: ${$('#pos-sua').val() || 0}\nSaleapp: ${$('#saleapp-sua').val() || 0}\nCSKH: ${$('#cskh-sua').val() || 0}\nCA: ${$('#ca-sua').val() || 0}\nSoundbox: ${$('#soundbox-sua').val() || 0}\nMTD MC: ${$('#mtd-sua').val() || 0}`;
            nv.baoCao = ndMoi; nv.trangThai = 'Đã báo cáo'; kiemTraTenTrongBaoCao(nv, ndMoi);
            hienThiDanhSachNhanVien(); luuVaoBoNhoTam(); modalSuaBaoCao.hide();
        }
    });
    
    const danTuBoNhoTam = async (sel) => {
        try { const txt = await navigator.clipboard.readText(); if (txt) { $(sel).val(txt).focus(); hienThiThongBao('Đã dán!'); } }
        catch (e) { hienThiThongBao('Không thể đọc bộ nhớ tạm.', 'error'); }
    };

    $('#nut-dan-tu-bo-nho').on('click', () => danTuBoNhoTam('#noi-dung-bao-cao-nhap'));
    $('#nut-dan-hang-loat').on('click', () => danTuBoNhoTam('#noi-dung-nhieu-bao-cao-nhap'));
    $('#nut-tao-bao-cao').on('click', () => thucHienTaoBaoCao(null, false));
    
    $('#nut-sao-chep').on('click', function() {
        navigator.clipboard.writeText($('#vung-ket-qua-bao-cao').val()).then(() => {
            const b = $('#nut-sao-chep'); b.html('<i class="fa-solid fa-check"></i> Xong'); b.addClass('copied');
            setTimeout(() => { b.html('<i class="fa-regular fa-copy"></i> Sao chép'); b.removeClass('copied'); }, 2000);
            hienThiThongBao('Đã chép!');
        });
    });
    
    $('#nut-xem-bao-cao-cu').on('click', () => modalXemBaoCaoCu.show());
    
    // KHỞI CHẠY
    khoiTaoGiaoDien();
    xayDungMenuGiaoDien();
    taiDuLieuTuServer(); 
});