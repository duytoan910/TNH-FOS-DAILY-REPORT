
import { dinhDangNgay, dinhDangNgayISO, layGiaTri } from './utils.js';

export const kiemTraTenNhanVien = (fosData, noiDungBaoCao) => {
    if (!noiDungBaoCao.trim()) {
        fosData.kiemTraTen = null;
        return;
    }
    const tenDaEscape = fosData.ten.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^(fos\\s+)?${tenDaEscape}(?=\\s|$)`, 'i');
    fosData.kiemTraTen = regex.test(noiDungBaoCao.trim());
};

export const kiemTraMTD = (danhSachFOS, baoCaoHomQua, ngayBaoCaoGanNhat) => {
    $('#mtd-warning-icon').hide();
    if (!baoCaoHomQua || !baoCaoHomQua.fosData) return;
    
    const danhSachLoi = [];
    const fosDataHomQuaMap = new Map(baoCaoHomQua.fosData.map(fos => [fos.ten, fos]));
    const dateLabel = ngayBaoCaoGanNhat ? dinhDangNgay(ngayBaoCaoGanNhat) : 'trước';

    danhSachFOS.forEach(fosHienTai => {
        const fosHomQua = fosDataHomQuaMap.get(fosHienTai.ten);
        if (!fosHomQua) return; 

        const mtdHomQua = fosHomQua.mtdMC || 0;
        let mcHomNay = layGiaTri(fosHienTai.baoCao, 'NTB') + layGiaTri(fosHienTai.baoCao, 'ETB');
        if (mcHomNay === 0) {
            mcHomNay = layGiaTri(fosHienTai.baoCao, 'Tổng MC');
        }

        const mtdHomNay = layGiaTri(fosHienTai.baoCao, 'MTD MC');

        if (fosHienTai.trangThai === 'Off') {
            if (mtdHomNay !== 0 && mtdHomNay !== mtdHomQua) { 
                 danhSachLoi.push({
                    ten: fosHienTai.ten,
                    lyDo: `Sai MTD (OFF)`,
                    chiTiet: `Cũ (${dateLabel}): ${mtdHomQua}. Nhập: ${mtdHomNay}. (OFF nên giữ nguyên MTD)`
                });
            }
        } else if (fosHienTai.trangThai === 'Đã báo cáo') { 
            const mtdDuKien = mtdHomQua + mcHomNay;
            if (mtdHomNay !== mtdDuKien) {
                danhSachLoi.push({
                    ten: fosHienTai.ten,
                    lyDo: `Cộng dồn MTD không chính xác.`,
                    chiTiet: `Dự kiến: ${mtdHomQua} (${dateLabel}) + ${mcHomNay} (nay) = ${mtdDuKien}. Thực tế: ${mtdHomNay}`
                });
            }
        }
    });

    if (danhSachLoi.length > 0) {
        let htmlLoi = `<p>Phát hiện sai sót MTD so với dữ liệu ngày ${dateLabel}:</p><ul class="list-group">`;
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
        $('#mtd-warning-list').html(htmlLoi);
        $('#mtd-warning-icon').show();
    }
};

export const generateReportPayload = (danhSachFOS, baoCaoHomQua, stats) => {
     const todayStr = dinhDangNgayISO(new Date());
     
     const tongKetToanDoi = {
         tongSoFOS: stats.tongFOS,
         tongSoMC: stats.tongMC,
         tongSoNTB: stats.tongNTB,
         NSBQ_NTB: parseFloat(stats.nsbqNTB),
         tongSoETB: stats.tongETB,
         NSBQ_ETB: parseFloat(stats.nsbqETB),
         tongSoAEPlus: stats.tongAEPlus,
         tyLePOS: `${stats.tongPosThucHien}/${stats.posChiTieu}`,
         tyLeActiveFOS: `${stats.activeFOS}/${stats.tongFOS}`
     };
     
     const baoCaoFOS = danhSachFOS.map(fos => {
         const noiDung = fos.baoCao || '';
         let mtd = layGiaTri(noiDung, 'MTD MC');
         
         let offValue = 0;
         if (fos.trangThai === 'Off') {
             const matchReason = noiDung.match(/^Fos\s+\S+\s+(.*)$/i);
             const reasonText = (matchReason && matchReason[1]) ? matchReason[1].trim() : 'OFF';
             
             if (reasonText.toUpperCase() === 'OFF') {
                 offValue = 1;
             } else {
                 offValue = reasonText;
             }

             if (mtd === 0 && baoCaoHomQua && baoCaoHomQua.fosData) {
                  const oldFos = baoCaoHomQua.fosData.find(f => f.ten === fos.ten);
                  if (oldFos) {
                      mtd = oldFos.mtdMC || 0;
                  }
             }
         } else {
             offValue = 0;
         }

         return {
             tenNhanVien: fos.ten,
             OFF: offValue,
             chiSoHieuSuat: {
                 saleHomNay: fos.trangThai === 'Off' ? 0 : layGiaTri(noiDung, ['Tổng MC']),
                 saleTrongThang: mtd,
                 chiTieu: fos.chiTieu
             },
             rawReport: fos.baoCao 
         };
     });

     return {
         ngayBaoCao: todayStr,
         tongKetToanDoi: tongKetToanDoi,
         baoCaoFOS: baoCaoFOS
     };
};
