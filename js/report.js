
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
            mcHomNay = layGiaTri(fosHienTai.baoCao, ['Tổng MC', 'MC']);
        }

        const mtdHomNay = layGiaTri(fosHienTai.baoCao, 'MTD MC');

        if (fosHienTai.trangThai === 'Off') {
            // Khi OFF, MTD hôm nay phải bằng MTD hôm qua
            if (mtdHomNay !== mtdHomQua && mtdHomNay !== 0) { 
                 danhSachLoi.push({
                    ten: fosHienTai.ten,
                    lyDo: `Sai MTD (OFF)`,
                    chiTiet: `Dữ liệu ngày ${dateLabel} là ${mtdHomQua}. Bạn nhập: ${mtdHomNay}. (OFF nên giữ nguyên MTD)`
                });
            }
        } else if (fosHienTai.trangThai === 'Đã báo cáo') { 
            const mtdDuKien = mtdHomQua + mcHomNay;
            // Cho phép bỏ qua kiểm tra nếu không nhập mtd (mtdHomNay === 0) 
            // vì hệ thống sẽ tự động điền khi tạo báo cáo. Chỉ cảnh báo nếu nhập mà sai.
            if (mtdHomNay !== 0 && mtdHomNay !== mtdDuKien) {
                danhSachLoi.push({
                    ten: fosHienTai.ten,
                    lyDo: `Cộng dồn MTD không chính xác.`,
                    chiTiet: `Dự kiến: ${mtdHomQua} (${dateLabel}) + ${mcHomNay} (nay) = ${mtdDuKien}. Thực tế nhập: ${mtdHomNay}`
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
         let mcHomNay = layGiaTri(noiDung, 'NTB') + layGiaTri(noiDung, 'ETB');
         if (mcHomNay === 0) {
            mcHomNay = layGiaTri(noiDung, ['Tổng MC', 'MC']);
         }
         
         let offValue = 0;
         if (fos.trangThai === 'Off') {
             const matchReason = noiDung.match(/^Fos\s+\S+\s+(.*)$/i);
             const reasonText = (matchReason && matchReason[1]) ? matchReason[1].trim() : 'OFF';
             
             if (reasonText.toUpperCase() === 'OFF') {
                 offValue = 1;
             } else {
                 offValue = reasonText;
             }
         } else {
             offValue = 0;
         }

         // Tự động lấy MTD cũ nếu OFF hoặc 0 SALE mà không nhập MTD
         if ((fos.trangThai === 'Off' || mcHomNay === 0) && mtd === 0 && baoCaoHomQua && baoCaoHomQua.fosData) {
             const oldFos = baoCaoHomQua.fosData.find(f => f.ten === fos.ten);
             if (oldFos) {
                 mtd = oldFos.mtdMC || 0;
             }
         }

         return {
             tenNhanVien: fos.ten,
             OFF: offValue,
             chiSoHieuSuat: {
                 saleHomNay: fos.trangThai === 'Off' ? 0 : mcHomNay,
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
