import { dinhDangNgayHienThi, dinhDangNgayISO, trichXuatSoLieu } from './utils.js';

export const kiemTraTenTrongBaoCao = (duLieuNv, noiDungBaoCao) => {
    if (!noiDungBaoCao.trim()) {
        duLieuNv.kiemTraTen = null;
        return;
    }
    const tenDaEscape = duLieuNv.ten.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const bieuThuc = new RegExp(`^(fos\\s+)?${tenDaEscape}(?=\\s|$)`, 'i');
    duLieuNv.kiemTraTen = bieuThuc.test(noiDungBaoCao.trim());
};

export const kiemTraChiSoMtd = (danhSachNhanVien, baoCaoLichSu, ngayBaoCaoLichSu) => {
    $('#bieu-tuong-canh-bao-mtd').hide();
    // baoCaoLichSu PHẢI là báo cáo của ngày gần nhất trong quá khứ (< hôm nay)
    if (!baoCaoLichSu || !baoCaoLichSu.duLieuNvLichSu) return;
    
    const danhSachLoi = [];
    const banDoNvLichSu = new Map(baoCaoLichSu.duLieuNvLichSu.map(nv => [nv.ten, nv]));
    const nhanNgay = ngayBaoCaoLichSu ? dinhDangNgayHienThi(ngayBaoCaoLichSu) : 'trước';

    danhSachNhanVien.forEach(nvNay => {
        const nvCu = banDoNvLichSu.get(nvNay.ten);
        if (!nvCu) return; 

        const mtdLichSu = nvCu.mtdMC || 0;
        let mcHomNay = trichXuatSoLieu(nvNay.baoCao, 'NTB') + trichXuatSoLieu(nvNay.baoCao, 'ETB');
        if (mcHomNay === 0) {
            mcHomNay = trichXuatSoLieu(nvNay.baoCao, ['Tổng MC', 'MC']);
        }

        const mtdHomNay = trichXuatSoLieu(nvNay.baoCao, 'MTD MC');

        if (nvNay.trangThai === 'Off') {
            // Khi OFF, MTD nhập vào (nếu có và khác 0) phải khớp với lịch sử (ngày < hôm nay)
            if (mtdHomNay !== mtdLichSu && mtdHomNay !== 0) { 
                 danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Sai MTD (Nghỉ)`,
                    chiTiet: `Dữ liệu ngày gần nhất (${nhanNgay}) là ${mtdLichSu}. Bạn nhập: ${mtdHomNay}. (Nghỉ nên giữ nguyên MTD)`
                });
            }
        } else if (nvNay.trangThai === 'Đã báo cáo') { 
            const mtdDuKien = mtdLichSu + mcHomNay;
            // Chỉ cảnh báo nếu người dùng nhập MTD khác 0 và khác với mốc cộng dồn từ quá khứ
            if (mtdHomNay !== 0 && mtdHomNay !== mtdDuKien) {
                danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Cộng dồn MTD sai lệch.`,
                    chiTiet: `Dự kiến: ${mtdLichSu} (${nhanNgay}) + ${mcHomNay} (nay) = ${mtdDuKien}. Thực tế nhập: ${mtdHomNay}`
                });
            }
        }
    });

    if (danhSachLoi.length > 0) {
        let htmlLoi = `<p>Phát hiện sai lệch MTD so với mốc lịch sử (${nhanNgay}):</p><ul class="list-group">`;
        danhSachLoi.forEach(loi => {
            htmlLoi += `
                <li class="list-group-item">
                    <div class="fw-bold">${loi.ten}</div>
                    <small class="text-danger">${loi.lyDo}</small>
                    <div class="text-muted" style="font-size: 0.8em;">${loi.chiTiet}</div>
                </li>
            `;
        });
        htmlLoi += '</ul>';
        $('#vung-danh-sach-loi-mtd').html(htmlLoi);
        $('#bieu-tuong-canh-bao-mtd').show();
    }
};

export const taoCauTrucGuiBaoCao = (danhSachNhanVien, baoCaoLichSu, thongKe) => {
     const homNayStr = dinhDangNgayISO(new Date());
     
     const tongKetToanDoi = {
         tongSoFOS: thongKe.tongFOS,
         tongSoMC: thongKe.tongMC,
         tongSoNTB: thongKe.tongNTB,
         NSBQ_NTB: parseFloat(thongKe.nsbqNTB),
         tongSoETB: thongKe.tongETB,
         NSBQ_ETB: parseFloat(thongKe.nsbqETB),
         tongSoAEPlus: thongKe.tongAEPlus,
         tyLePOS: `${thongKe.tongPosThucHien}/${thongKe.posChiTieu}`,
         tyLeActiveFOS: `${thongKe.activeFOS}/${thongKe.tongFOS}`
     };
     
     const baoCaoNhanVien = danhSachNhanVien.map(nv => {
         const noiDung = nv.baoCao || '';
         let mtd = trichXuatSoLieu(noiDung, 'MTD MC');
         let mcHomNay = trichXuatSoLieu(noiDung, 'NTB') + trichXuatSoLieu(noiDung, 'ETB');
         if (mcHomNay === 0) {
            mcHomNay = trichXuatSoLieu(noiDung, ['Tổng MC', 'MC']);
         }
         
         let giaTriOff = 0;
         if (nv.trangThai === 'Off') {
             const khopLyDo = noiDung.match(/^Fos\s+\S+\s+(.*)$/i);
             const chuLyDo = (khopLyDo && khopLyDo[1]) ? khopLyDo[1].trim() : 'OFF';
             giaTriOff = chuLyDo.toUpperCase() === 'OFF' ? 1 : chuLyDo;
         }

         // LOGIC MTD: Nếu nhân viên OFF hoặc 0 sale, và mtd hiện tại vẫn là 0 (chưa nhập mới)
         // Luôn lấy từ baoCaoLichSu (ngày gần nhất TRƯỚC HÔM NAY)
         if ((nv.trangThai === 'Off' || mcHomNay === 0) && mtd === 0 && baoCaoLichSu && baoCaoLichSu.duLieuNvLichSu) {
             const nvCu = baoCaoLichSu.duLieuNvLichSu.find(f => f.ten === nv.ten);
             if (nvCu) {
                 mtd = nvCu.mtdMC || 0;
             }
         }

         return {
             tenNhanVien: nv.ten,
             OFF: giaTriOff,
             chiSoHieuSuat: {
                 saleHomNay: nv.trangThai === 'Off' ? 0 : mcHomNay,
                 saleTrongThang: mtd,
                 chiTieu: nv.chiTieu
             },
             rawReport: nv.baoCao 
         };
     });

     return {
         ngayBaoCao: homNayStr,
         tongKetToanDoi: tongKetToanDoi,
         baoCaoFOS: baoCaoNhanVien
     };
};