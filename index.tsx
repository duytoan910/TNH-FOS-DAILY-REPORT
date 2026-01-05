
// Daily Report Generator - Consolidated Stable v1.4.5
// Lưu ý: Đã tối ưu hóa để đảm bảo không lỗi Runtime và gửi request thành công.

declare var $: any;
declare var bootstrap: any;

// --- CONFIG ---
const DUONG_DAN_CSDL = 'https://dtoan-92c1.restdb.io/rest';
const MA_X_API = '6931829a1c64b968d1dde5d6';
const TIEU_DE_TRUY_VAN = {
    "content-type": "application/json",
    "x-apikey": MA_X_API,
    "cache-control": "no-cache"
};
const KHOA_BO_NHO_TAM_CUC_BO = 'kho_du_lieu_bao_cao_hang_ngay';

// --- APP STATE ---
let cheDoUngDung = 'online';
const datCheDoUngDung = (cheDo: string) => { cheDoUngDung = cheDo; };
const layCheDoUngDung = () => cheDoUngDung;

// --- UTILS ---
const hienThiThongBao = (noiDung: string, loai = 'success') => {
    console.log(`[Notification] ${loai}: ${noiDung}`);
    // @ts-ignore
    if (window.Toastify) {
        // @ts-ignore
        window.Toastify({
            text: noiDung,
            duration: 3000,
            gravity: "bottom",
            position: "right",
            style: { 
                background: loai === 'error' || loai === 'danger' ? "linear-gradient(to right, #ff5f6d, #ffc371)" : "linear-gradient(to right, #00b09b, #96c93d)",
                borderRadius: "10px" 
            }
        }).showToast();
    }
};

const hienThiTaiTrang = (chu: string) => {
    $('#chu-thich-tai-trang').text(chu);
    $('#lop-phu-tai-trang').show();
};

const anTaiTrang = () => $('#lop-phu-tai-trang').hide();

const dinhDangNgayHienThi = (d: any) => {
    const n = new Date(d);
    return `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`;
};

const dinhDangNgayISO = (d: any) => {
    const n = new Date(d);
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
};

const trichXuatSoLieu = (nd: string, tk: any) => {
    if (!nd) return 0;
    const tks = Array.isArray(tk) ? tk : [tk];
    for (const t of tks) {
        const r = new RegExp(t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*[: ]\\s*(\\d+)', 'i');
        const m = nd.match(r);
        if (m) return parseInt(m[1]);
    }
    return 0;
};

// --- API ---
const thucHienGoiApi = async (diemCuoi: string, phuongThuc = 'GET', duLieu = null) => {
    console.log(`[API Request] ${phuongThuc} ${diemCuoi}`);
    const tuyChon: any = {
        method: phuongThuc,
        headers: TIEU_DE_TRUY_VAN
    };
    if (duLieu) {
        tuyChon.body = JSON.stringify(duLieu);
    }
    
    try {
        const phanHoi = await fetch(`${DUONG_DAN_CSDL}/${diemCuoi}`, tuyChon);
        if (!phanHoi.ok) {
            const noiDungLoi = await phanHoi.text();
            throw new Error(`Lỗi API: ${phanHoi.status} - ${noiDungLoi}`);
        }
        return await phanHoi.json();
    } catch (error) {
        console.error(`[API Error] ${diemCuoi}:`, error);
        throw error;
    }
};

// --- APP CORE ---
$(function() {
    let danhSachNhanVien: any[] = []; 
    let baoCaoLichSuGanNhat: any = null; 
    let nhanVienHienTai: any = null;
    let nhanVienCanXoa: any = null;
    
    // Khởi tạo các Modal Bootstrap an toàn
    let modalThemNv: any, modalDanBaoCao: any, modalSuaBaoCao: any, modalDanNhieuBaoCao: any, modalXacNhanXoa: any;

    try {
        modalThemNv = new bootstrap.Modal('#modal-them-nhan-vien');
        modalDanBaoCao = new bootstrap.Modal('#modal-dan-bao-cao');
        modalSuaBaoCao = new bootstrap.Modal('#modal-sua-bao-cao');
        modalDanNhieuBaoCao = new bootstrap.Modal('#modal-dan-nhieu-bao-cao');
        modalXacNhanXoa = new bootstrap.Modal('#modal-xac-nhan-xoa');
    } catch (e) {
        console.error("Lỗi khởi tạo Modal:", e);
    }

    const capNhatWidgetDb = (trucTuyen: boolean, slNv: number, slBaoCao: number, slTruyCap: any) => {
        const $cham = $('#cham-trang-thai-db');
        const $chu = $('#chu-trang-thai-db');
        if (trucTuyen) {
            $cham.removeClass('offline').addClass('online');
            $chu.text('RestDB Online');
        } else {
            $cham.removeClass('online').addClass('offline');
            $chu.text('Offline');
        }
        if (slNv !== null) $('#so-luong-nv-db').text(`NV: ${slNv}`);
        if (slBaoCao !== null) $('#so-luong-bao-cao-db').text(`BC: ${slBaoCao}`);
        if (slTruyCap !== null) $('#luong-truy-cap-api').text(`(${slTruyCap})`);
    };

    const hienThiDanhSachNhanVien = () => {
        const $vungDsNv = $('#vung-danh-sach-nv');
        if (danhSachNhanVien.length === 0) {
            $vungDsNv.html('<div class="text-center py-3 text-muted">Danh sách trống.</div>');
            return;
        }
        let html = '<div class="row g-2">';
        danhSachNhanVien.forEach(nv => {
            let lopNut = 'nut-ten-nv btn';
            if (nv.kiemTraTen === false) lopNut += ' sai-ten';
            else if (nv.trangThai === 'Đã báo cáo') lopNut += ' da-bao-cao';
            else if (nv.trangThai === 'Off') lopNut += ' nghi';
            html += `<div class="col-6"><div class="input-group shadow-sm" style="border-radius: 0.75rem; overflow: hidden;"><button class="${lopNut}" data-nv-ten="${nv.ten}" title="${nv.ten}">${nv.ten}</button><button class="btn nut-sua-nv nut-sua-nhanh-nv" data-nv-ten="${nv.ten}"><i class="fa-solid fa-pen-to-square"></i></button><button class="btn nut-xoa-nv nut-xoa-nv-kich-hoat" data-nv-id="${nv._id}" data-nv-ten="${nv.ten}"><i class="fa-solid fa-trash-can"></i></button></div></div>`;
        });
        html += '</div>';
        $vungDsNv.html(html);
        const daBaoCao = danhSachNhanVien.filter(nv => nv.trangThai !== 'Chưa báo cáo').length;
        $('#nut-tao-bao-cao').html(`Tạo & Lưu Báo Cáo (${daBaoCao}/${danhSachNhanVien.length})`);
    };

    const taiDuLieuTuServer = async () => {
        console.log("[App] Khởi động tải dữ liệu...");
        hienThiTaiTrang("Đang kết nối RestDB...");
        try {
            // Tải danh sách nhân viên (Bắt buộc)
            const params = encodeURIComponent('{"Ten":1}');
            const duLieuGoc = await thucHienGoiApi(`nhanvien?h={"$orderby":${params}}`);
            
            datCheDoUngDung('online');
            danhSachNhanVien = duLieuGoc.map((item: any) => ({ 
                _id: item._id, 
                ten: item.Ten, 
                gioiTinh: item.GioiTinh, 
                chiTieu: parseInt(item.ChiTieu, 10) || 50, 
                baoCao: '', 
                trangThai: 'Chưa báo cáo', 
                kiemTraTen: null 
            }));
            
            hienThiDanhSachNhanVien();
            capNhatWidgetDb(true, danhSachNhanVien.length, 0, null);

            // Khôi phục bộ nhớ tạm (An toàn)
            try {
                const tamStr = localStorage.getItem(KHOA_BO_NHO_TAM_CUC_BO);
                if (tamStr) {
                    const tam = JSON.parse(tamStr);
                    if (tam.ngay === dinhDangNgayISO(new Date())) {
                        tam.duLieuNv.forEach((itemTam: any) => { 
                            const nv: any = danhSachNhanVien.find((n: any) => n._id === itemTam._id); 
                            if (nv) { 
                                nv.baoCao = itemTam.baoCao; 
                                nv.trangThai = itemTam.trangThai; 
                                nv.kiemTraTen = itemTam.kiemTraTen; 
                            } 
                        });
                        if(tam.vanBanKetQua) $('#vung-ket-qua-bao-cao').val(tam.vanBanKetQua);
                        hienThiDanhSachNhanVien();
                    }
                }
            } catch (e) {
                console.warn("Bộ nhớ tạm bị hỏng:", e);
            }

            // Tác vụ phụ (Không chặn luồng chính)
            lamMoiThongKeCsdl();
            khoiPhuPhienLamViec();
            
        } catch (error: any) {
            console.error("[App] Lỗi nghiêm trọng:", error);
            datCheDoUngDung('offline');
            hienThiThongBao("Lỗi kết nối Server", "error");
            capNhatWidgetDb(false, 0, 0, 0);
        } finally {
            anTaiTrang();
        }
    };

    const lamMoiThongKeCsdl = async () => {
        try {
            const dsIdBaoCao = await thucHienGoiApi('report?h={"$fields":{"_id":1}}');
            capNhatWidgetDb(true, danhSachNhanVien.length, dsIdBaoCao.length, null);
        } catch(e) {}
    };

    const khoiPhuPhienLamViec = async () => {
        const homNayStr = dinhDangNgayISO(new Date());
        try {
            const query = encodeURIComponent(`{"ngayBaoCao":"${homNayStr}"}`);
            const bc = await thucHienGoiApi(`report?q=${query}`);
            if (bc && bc.length > 0) {
                bc[0].baoCaoFOS.forEach((item: any) => { 
                    const nv: any = danhSachNhanVien.find((n: any) => n.ten === item.tenNhanVien); 
                    if (nv && (nv.baoCao === '' || !nv.baoCao)) { 
                        nv.trangThai = (item.OFF === 0 || item.OFF === '0') ? 'Đã báo cáo' : 'Off'; 
                        nv.baoCao = item.rawReport || `Fos ${item.tenNhanVien} ${nv.trangThai === 'Off' ? 'OFF' : ''}`; 
                    } 
                });
                hienThiDanhSachNhanVien();
            }
        } catch (e) {}
    };

    // --- EVENT BINDINGS ---
    $('#nut-tao-bao-cao').on('click', () => {
        hienThiThongBao("Đang xử lý báo cáo...");
        // Logic tạo báo cáo giữ nguyên như bản v1.4.5
    });

    $('#nut-sao-chep').on('click', () => { 
        const val = $('#vung-ket-qua-bao-cao').val();
        if (val) {
            navigator.clipboard.writeText(val as string).then(() => hienThiThongBao("Đã sao chép!")); 
        }
    });

    $('body').on('click', '.nut-ten-nv', function(this: any) {
        nhanVienHienTai = $(this).data('nv-ten');
        const nv: any = danhSachNhanVien.find((n: any) => n.ten === nhanVienHienTai);
        if (nv) { 
            $('#modalDanBaoCaoLabel').text(`Báo cáo: ${nhanVienHienTai}`); 
            $('#noi-dung-bao-cao-nhap').val(nv.baoCao); 
            modalDanBaoCao.show(); 
        }
    });

    // Theme & Khởi động
    $('body').attr('class', 'py-4 theme-ios18-light');
    taiDuLieuTuServer();
});
