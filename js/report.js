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
    // baoCaoLichSu PHẢI là báo cáo của ngày gần nhất TRONG QUÁ KHỨ (< hôm nay)
    if (!baoCaoLichSu || !baoCaoLichSu.duLieuNvLichSu) return;
    
    const danhSachLoi = [];
    const banDoNvLichSu = new Map(baoCaoLichSu.duLieuNvLichSu.map(nv => [nv.ten, nv]));
    const nhanNgay = ngayBaoCaoLichSu ? dinhDangNgayHienThi(ngayBaoCaoLichSu) : 'trước';

    danhSachNhanVien.forEach(nvNay => {
        const nvCu = banDoNvLichSu.get(nvNay.ten);
        if (!nvCu) return; 

        const mtdLichSu = nvCu.mtdMC || 0;
        let mcHomNay = trichXuatSoLieu(nvNay.baoCao, 'NTB') + trichXuatSoLieu(nvNay.baoCao, 'ETB');
        if (mcHomNay === 0) mcHomNay = trichXuatSoLieu(nvNay.baoCao, ['Tổng MC', 'MC']);

        const mtdHomNay = trichXuatSoLieu(nvNay.baoCao, 'MTD MC');

        if (nvNay.trangThai === 'Off') {
            if (mtdHomNay !== mtdLichSu && mtdHomNay !== 0) { 
                 danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Sai MTD (Nghỉ)`,
                    chiTiet: `Dữ liệu ngày ${nhanNgay} là ${mtdLichSu}. Bạn nhập: ${mtdHomNay}. (Nghỉ nên giữ nguyên MTD)`
                });
            }
        } else if (nvNay.trangThai === 'Đã báo cáo') { 
            const mtdDuKien = mtdLichSu + mcHomNay;
            if (mtdHomNay !== 0 && mtdHomNay !== mtdDuKien) {
                danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Cộng dồn MTD sai lệch.`,
                    chiTiet: `Dự kiến: ${mtdLichSu} (ngày ${nhanNgay}) + ${mcHomNay} (nay) = ${mtdDuKien}. Thực tế nhập: ${mtdHomNay}`
                });
            }
        }
    });

    if (danhSachLoi.length > 0) {
        let htmlLoi = `<p class="mb-2">Phát hiện sai lệch MTD so với mốc lịch sử (${nhanNgay}):</p><ul class="list-group">`;
        danhSachLoi.forEach(loi => {
            htmlLoi += `
                <li class="list-group-item border-start-0 border-end-0 px-0">
                    <div class="fw-bold">${loi.ten}</div>
                    <small class="text-danger fw-600">${loi.lyDo}</small>
                    <div class="text-muted small">${loi.chiTiet}</div>
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
         if (mcHomNay === 0) mcHomNay = trichXuatSoLieu(noiDung, ['Tổng MC', 'MC']);
         
         let giaTriOff = 0;
         if (nv.trangThai === 'Off') {
             const khopLyDo = noiDung.match(/^Fos\s+\S+\s+(.*)$/i);
             const chuLyDo = (khopLyDo && khopLyDo[1]) ? khopLyDo[1].trim() : 'OFF';
             giaTriOff = chuLyDo.toUpperCase() === 'OFF' ? 1 : chuLyDo;
         }

         if ((nv.trangThai === 'Off' || mcHomNay === 0) && mtd === 0 && baoCaoLichSu && baoCaoLichSu.duLieuNvLichSu) {
             const nvCu = baoCaoLichSu.duLieuNvLichSu.find(f => f.ten === nv.ten);
             if (nvCu) mtd = nvCu.mtdMC || 0;
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