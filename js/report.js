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
    
    if (!baoCaoLichSu || !baoCaoLichSu.duLieuNvLichSu) return;
    
    const danhSachLoi = [];
    const banDoNvLichSu = new Map(baoCaoLichSu.duLieuNvLichSu.map(nv => [nv.ten, nv]));
    
    // Nhãn mốc lịch sử gần nhất (ví dụ: chốt ngày 20/12/2025)
    const nhanNgay = ngayBaoCaoLichSu ? dinhDangNgayHienThi(ngayBaoCaoLichSu) : 'trước đó';

    danhSachNhanVien.forEach(nvNay => {
        const nvCu = banDoNvLichSu.get(nvNay.ten);
        if (!nvCu) return; 

        const mtdLichSu = nvCu.mtdMC || 0;
        let ntb = trichXuatSoLieu(nvNay.baoCao, 'NTB');
        let etb = trichXuatSoLieu(nvNay.baoCao, 'ETB');
        let mcHomNay = ntb + etb;
        
        if (mcHomNay === 0) {
            mcHomNay = trichXuatSoLieu(nvNay.baoCao, ['Tổng MC', 'MC']);
        }

        const mtdHomNay = trichXuatSoLieu(nvNay.baoCao, 'MTD MC');

        // Kiểm tra sai lệch
        if (nvNay.trangThai === 'Off') {
            // Khi OFF, MTD hôm nay phải bằng MTD của ngày chốt gần nhất
            if (mtdHomNay !== mtdLichSu && mtdHomNay !== 0) { 
                 danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Nghỉ nhưng MTD sai`,
                    chiTiet: `Mốc chốt cũ (${nhanNgay}) là ${mtdLichSu}. Nhập: ${mtdHomNay}.`
                });
            }
        } else if (nvNay.trangThai === 'Đã báo cáo') { 
            // Dự kiến = MTD chốt cũ + MC mới hôm nay
            const mtdDuKien = mtdLichSu + mcHomNay;
            if (mtdHomNay !== 0 && mtdHomNay !== mtdDuKien) {
                danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Cộng dồn MTD sai`,
                    chiTiet: `Dự kiến: ${mtdLichSu} (chốt ${nhanNgay}) + ${mcHomNay} (nay) = ${mtdDuKien}. Nhập: ${mtdHomNay}.`
                });
            }
        }
    });

    if (danhSachLoi.length > 0) {
        let htmlLoi = `<div class="alert alert-info py-2 small mb-3">So sánh chỉ số với mốc chốt gần nhất ngày <strong>${nhanNgay}</strong></div><div class="list-group list-group-flush">`;
        danhSachLoi.forEach(loi => {
            htmlLoi += `
                <div class="list-group-item px-0 border-0 mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold">${loi.ten}</span>
                        <span class="badge bg-danger rounded-pill">${loi.lyDo}</span>
                    </div>
                    <div class="text-secondary small" style="line-height: 1.3;">${loi.chiTiet}</div>
                </div>
            `;
        });
        htmlLoi += '</div>';
        $('#vung-danh-sach-loi-mtd').html(htmlLoi);
        $('#bieu-tuong-canh-bao-mtd').fadeIn();
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
         } else if (mtd === 0 && nv.trangThai === 'Đã báo cáo' && baoCaoLichSu && baoCaoLichSu.duLieuNvLichSu) {
             const nvCu = baoCaoLichSu.duLieuNvLichSu.find(f => f.ten === nv.ten);
             if (nvCu) mtd = (nvCu.mtdMC || 0) + mcHomNay;
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