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

export const kiemTraChiSoMtd = (danhSachNhanVien, baoCaoNgayTruoc, ngayBaoCaoGanNhat) => {
    $('#bieu-tuong-canh-bao-mtd').hide();
    if (!baoCaoNgayTruoc || !baoCaoNgayTruoc.duLieuNv) return;
    
    const danhSachLoi = [];
    const banDoNvCu = new Map(baoCaoNgayTruoc.duLieuNv.map(nv => [nv.ten, nv]));
    const nhanNgay = ngayBaoCaoGanNhat ? dinhDangNgayHienThi(ngayBaoCaoGanNhat) : 'trước';

    danhSachNhanVien.forEach(nvNay => {
        const nvCu = banDoNvCu.get(nvNay.ten);
        if (!nvCu) return; 

        const mtdNgayTruoc = nvCu.mtdMC || 0;
        let mcHomNay = trichXuatSoLieu(nvNay.baoCao, 'NTB') + trichXuatSoLieu(nvNay.baoCao, 'ETB');
        if (mcHomNay === 0) {
            mcHomNay = trichXuatSoLieu(nvNay.baoCao, ['Tổng MC', 'MC']);
        }

        const mtdHomNay = trichXuatSoLieu(nvNay.baoCao, 'MTD MC');

        if (nvNay.trangThai === 'Off') {
            if (mtdHomNay !== mtdNgayTruoc && mtdHomNay !== 0) { 
                 danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Sai MTD (OFF)`,
                    chiTiet: `Dữ liệu ngày ${nhanNgay} là ${mtdNgayTruoc}. Bạn nhập: ${mtdHomNay}. (OFF nên giữ nguyên MTD)`
                });
            }
        } else if (nvNay.trangThai === 'Đã báo cáo') { 
            const mtdDuKien = mtdNgayTruoc + mcHomNay;
            if (mtdHomNay !== 0 && mtdHomNay !== mtdDuKien) {
                danhSachLoi.push({
                    ten: nvNay.ten,
                    lyDo: `Cộng dồn MTD không chính xác.`,
                    chiTiet: `Dự kiến: ${mtdNgayTruoc} (${nhanNgay}) + ${mcHomNay} (nay) = ${mtdDuKien}. Thực tế nhập: ${mtdHomNay}`
                });
            }
        }
    });

    if (danhSachLoi.length > 0) {
        let htmlLoi = `<p>Phát hiện sai sót MTD so với dữ liệu ngày ${nhanNgay}:</p><ul class="list-group">`;
        danhSachLoi.forEach(loi => {
            htmlLoi += `
                <li class="list-group-item">
                    <div class="fw-bold">${loi.ten}</div>
                    <small>${loi.lyDo}</small>
                    <div class="text-muted" style="font-size: 0.8em;">${loi.chiTiet}</div>
                </li>
            `;
        });
        htmlLoi += '</ul>';
        $('#vung-danh-sach-loi-mtd').html(htmlLoi);
        $('#bieu-tuong-canh-bao-mtd').show();
    }
};

export const taoCauTrucGuiBaoCao = (danhSachNhanVien, baoCaoNgayTruoc, thongKe) => {
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
             
             if (chuLyDo.toUpperCase() === 'OFF') {
                 giaTriOff = 1;
             } else {
                 giaTriOff = chuLyDo;
             }
         } else {
             giaTriOff = 0;
         }

         if ((nv.trangThai === 'Off' || mcHomNay === 0) && mtd === 0 && baoCaoNgayTruoc && baoCaoNgayTruoc.duLieuNv) {
             const nvCu = baoCaoNgayTruoc.duLieuNv.find(f => f.ten === nv.ten);
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