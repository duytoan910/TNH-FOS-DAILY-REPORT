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
    
    // Nếu không có báo cáo lịch sử (ngày cũ hơn hôm nay), không thực hiện kiểm tra
    if (!baoCaoLichSu || !baoCaoLichSu.duLieuNvLichSu) return;
    
    const danhSachLoi = [];
    const banDoNvLichSu = new Map(baoCaoLichSu.duLieuNvLichSu.map(nv => [nv.ten, nv]));
    
    // nhanNgay là ngày của báo cáo lịch sử (ví dụ 20/12/2025)
    const nhanNgay = ngayBaoCaoLichSu ? dinhDangNgayHienThi(ngayBaoCaoLichSu) : 'trước đó';

    danhSachNhanVien.forEach(nvNay => {
        const nvCu = banDoNvLichSu.get(nvNay.ten);
        if (!nvCu) return; 

        const mtdLichSu = nvCu.mtdMC || 0;
        let mcHomNay = trichXuatSoLieu(nvNay.baoCao, 'NTB') + trichXuatSoLieu(nvNay.baoCao, 'ETB');
        if (mcHomNay === 0) mcHomNay = trichXuatSoLieu(nvNay.baoCao, ['Tổng MC', 'MC']);

        const mtdHomNay = trichXuatSoLieu(nvNay.baoCao, 'MTD MC');

        if (nvNay.trangThai === 'Off') {
            // Khi OFF, MTD mới phải bằng MTD lịch sử
            if (mtdHomNay !== mtdLichSu && mtdHomNay !== 0) { 
                 danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Sai MTD khi nghỉ`,
                    chiTiet: `Mốc cũ (${nhanNgay}) là ${mtdLichSu}. Bạn nhập: ${mtdHomNay}. (Nghỉ nên giữ nguyên MTD)`
                });
            }
        } else if (nvNay.trangThai === 'Đã báo cáo') { 
            // Dự kiến = MTD cũ + MC nay
            const mtdDuKien = mtdLichSu + mcHomNay;
            if (mtdHomNay !== 0 && mtdHomNay !== mtdDuKien) {
                danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Cộng dồn MTD sai lệch`,
                    chiTiet: `Dự kiến: ${mtdLichSu} (ngày ${nhanNgay}) + ${mcHomNay} (nay) = ${mtdDuKien}. Thực tế nhập: ${mtdHomNay}`
                });
            }
        }
    });

    if (danhSachLoi.length > 0) {
        let htmlLoi = `<p class="mb-2 small text-muted">So sánh với dữ liệu ngày ${nhanNgay}:</p><div class="list-group list-group-flush">`;
        danhSachLoi.forEach(loi => {
            htmlLoi += `
                <div class="list-group-item px-0 border-0">
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold">${loi.ten}</span>
                        <span class="badge bg-danger rounded-pill">${loi.lyDo}</span>
                    </div>
                    <div class="text-secondary small mt-1">${loi.chiTiet}</div>
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