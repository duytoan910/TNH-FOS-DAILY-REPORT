
import { DUONG_DAN_CSDL, TIEU_DE_TRUY_VAN } from './config.js';
import { dinhDangNgayISO } from './utils.js';

let cheDoUngDung = 'online';

export const datCheDoUngDung = (cheDo) => {
    cheDoUngDung = cheDo;
};

export const layCheDoUngDung = () => {
    return cheDoUngDung;
};

export const thucHienGoiApi = async (diemCuoi, phuongThuc = 'GET', duLieu = null, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const tuyChon = {
        method: phuongThuc,
        headers: TIEU_DE_TRUY_VAN,
        signal: controller.signal
    };
    
    if (duLieu) {
        tuyChon.body = JSON.stringify(duLieu);
    }
    
    const url = `${DUONG_DAN_CSDL}/${diemCuoi}`;
    
    try {
        const phanHoi = await fetch(url, tuyChon);
        clearTimeout(id);
        
        if (!phanHoi.ok) {
            const noiDungLoi = await phanHoi.text();
            throw new Error(`Lỗi API: ${phanHoi.status} - ${noiDungLoi}`);
        }
        return await phanHoi.json();
    } catch (error) {
        clearTimeout(id);
        console.error("Lỗi Fetch API:", error.name === 'AbortError' ? 'Timeout kết nối' : error.message);
        throw error;
    }
};

export const ghiNhanTuongTacApi = async () => {
    if (cheDoUngDung === 'offline') return;

    const homNayStr = dinhDangNgayISO(new Date());
    
    try {
        const danhSachCaiDat = await thucHienGoiApi(`setting?max=1`, 'GET', null, 3000);
        
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
            }, 3000);
        } else {
             if (window.$) $('#luong-truy-cap-api').text(`(1)`);
            await thucHienGoiApi('setting', 'POST', {
                connectionCount: 1,
                date: homNayStr
            }, 3000);
        }
    } catch (e) {
        console.warn("Ghi nhận tương tác thất bại:", e);
    }
};

export const lamMoiThongKeCsdl = async (hamCapNhatWidget) => {
    try {
        const headers = TIEU_DE_TRUY_VAN;
        const queryReport = encodeURIComponent('{}');
        const hint = encodeURIComponent('{"$fields":{"_id":1}}');
        
        // Sử dụng Promise.all để lấy thông số nhanh hơn
        const [resReport, resNv, resSet] = await Promise.all([
            fetch(`${DUONG_DAN_CSDL}/report?q=${queryReport}&h=${hint}`, { headers }).then(r => r.json()),
            fetch(`${DUONG_DAN_CSDL}/nhanvien?q=${queryReport}&h=${hint}`, { headers }).then(r => r.json()),
            fetch(`${DUONG_DAN_CSDL}/setting?max=1`, { headers }).then(r => r.json())
        ]);
        
        let soLuotKetNoi = 0;
        if(resSet && resSet.length > 0) {
            const c = resSet[0];
            if (c.date === dinhDangNgayISO(new Date())) {
                 soLuotKetNoi = c.connectionCount || 0;
            }
        }
        
        if (hamCapNhatWidget) {
            hamCapNhatWidget(true, resNv.length, resReport.length, soLuotKetNoi);
        }
    } catch (e) {
        console.warn("Lấy thống kê DB thất bại", e);
        if (hamCapNhatWidget) hamCapNhatWidget(false, 0, 0, 0);
    }
};
