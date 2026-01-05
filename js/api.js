
import { DUONG_DAN_CSDL, TIEU_DE_TRUY_VAN } from './config.js';
import { dinhDangNgayISO } from './utils.js';

let cheDoUngDung = 'online';

export const datCheDoUngDung = (cheDo) => {
    cheDoUngDung = cheDo;
};

export const layCheDoUngDung = () => {
    return cheDoUngDung;
};

export const thucHienGoiApi = async (diemCuoi, phuongThuc = 'GET', duLieu = null) => {
    const tuyChon = {
        method: phuongThuc,
        headers: TIEU_DE_TRUY_VAN
    };
    if (duLieu) {
        tuyChon.body = JSON.stringify(duLieu);
    }
    
    // Đảm bảo URL được xử lý các ký tự đặc biệt nếu cần
    const url = `${DUONG_DAN_CSDL}/${diemCuoi}`;
    
    try {
        const phanHoi = await fetch(url, tuyChon);
        if (!phanHoi.ok) {
            const noiDungLoi = await phanHoi.text();
            throw new Error(`Lỗi API: ${phanHoi.status} - ${noiDungLoi}`);
        }
        return await phanHoi.json();
    } catch (error) {
        console.error("Lỗi Fetch API:", error);
        throw error;
    }
};

export const ghiNhanTuongTacApi = async () => {
    if (cheDoUngDung === 'offline') return;

    const homNayStr = dinhDangNgayISO(new Date());
    
    try {
        const danhSachCaiDat = await thucHienGoiApi(`setting?max=1`);
        
        if (danhSachCaiDat && danhSachCaiDat.length > 0) {
            const caiDat = danhSachCaiDat[0];
            let soLuotMoi = (caiDat.connectionCount || 0) + 1;
            
            if (caiDat.date !== homNayStr) {
                soLuotMoi = 1;
            }
            
            if (window.$) $('#luong-truy-cap-api').text(`(${soLuotMoi})`);

            await thucHienGoiApi(`setting/${caiDat._id}`, 'PUT', { 
                connectionCount: soLuotMoi,
                date: homNayStr 
            });
        } else {
             if (window.$) $('#luong-truy-cap-api').text(`(1)`);
            await thucHienGoiApi('setting', 'POST', {
                connectionCount: 1,
                date: homNayStr
            });
        }
    } catch (e) {
        console.warn("Ghi nhận tương tác thất bại:", e);
    }
};

export const lamMoiThongKeCsdl = async (hamCapNhatWidget) => {
    try {
        const queryReport = encodeURIComponent('{}');
        const hintReport = encodeURIComponent('{"$fields":{"_id":1}}');
        const phanHoiBaoCao = await fetch(`${DUONG_DAN_CSDL}/report?q=${queryReport}&h=${hintReport}`, {method: 'GET', headers: TIEU_DE_TRUY_VAN});
        const dsIdBaoCao = await phanHoiBaoCao.json();
        
        const hintNv = encodeURIComponent('{"$fields":{"_id":1}}');
        const phanHoiNv = await fetch(`${DUONG_DAN_CSDL}/nhanvien?q=${queryReport}&h=${hintNv}`, {method: 'GET', headers: TIEU_DE_TRUY_VAN});
        const dsIdNv = await phanHoiNv.json();
        
        const phanHoiCaiDat = await fetch(`${DUONG_DAN_CSDL}/setting?max=1`, {method: 'GET', headers: TIEU_DE_TRUY_VAN});
        const dsCaiDat = await phanHoiCaiDat.json();
        
        let soLuotKetNoi = 0;
        if(dsCaiDat && dsCaiDat.length > 0) {
            const c = dsCaiDat[0];
            const homNayStr = dinhDangNgayISO(new Date());
            if (c.date === homNayStr) {
                 soLuotKetNoi = c.connectionCount || 0;
            }
        }
        
        if (hamCapNhatWidget) {
            hamCapNhatWidget(true, dsIdNv.length, dsIdBaoCao.length, soLuotKetNoi);
        }
    } catch (e) {
        console.warn("Lấy thống kê DB thất bại", e);
        if (hamCapNhatWidget) hamCapNhatWidget(false, 0, 0, 0);
    }
};
