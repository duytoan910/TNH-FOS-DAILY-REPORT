
import { LOCAL_CACHE_KEY } from './config.js';
import { showStatus, showLoading, hideLoading, dinhDangNgay, dinhDangNgayISO, layGiaTri } from './utils.js';
import { initializeTheme, buildThemeMenu, applyTheme, saveThemePreference, applyRandomTheme } from './theme.js';
import { apiCall, trackApiInteraction, refreshDbStats, setAppMode, getAppMode } from './api.js';
import { kiemTraTenNhanVien, kiemTraMTD, generateReportPayload } from './report.js';

$(function() {
    // --- STATE ---
    let danhSachFOS = []; 
    let baoCaoHomQua = null; 
    let ngayBaoCaoGanNhat = null; 
    let fosHienTai = null;
    let fosCanXoa = null;
    
    // --- UI HELPERS ---
    const updateDbWidget = (isOnline, nvCount, reportCount, connCount) => {
        const $dot = $('#db-status-dot');
        const $text = $('#db-status-text');
        const $nv = $('#db-count-nv');
        const $rp = $('#db-count-report');
        const $usage = $('#db-api-usage');
        
        if (isOnline) {
            $dot.removeClass('offline').addClass('online');
            $text.text('DB Connected');
        } else {
            $dot.removeClass('online').addClass('offline');
            $text.text('Offline Mode');
        }
        if (nvCount !== null) $nv.text(`NV: ${nvCount}`);
        if (reportCount !== null) $rp.text(`Rpt: ${reportCount}`);
        if (connCount !== null) {
            $usage.text(`(${connCount})`);
            $usage.removeClass('text-danger fw-bold').addClass('text-muted');
        }
    }

    const $fosListArea = $('#fos-list-area');
    const themFosModal = new bootstrap.Modal('#themFosModal');
    const danBaoCaoModal = new bootstrap.Modal('#danBaoCaoModal');
    const suaBaoCaoModal = new bootstrap.Modal('#suaBaoCaoModal');
    const danNhieuBaoCaoModal = new bootstrap.Modal('#danNhieuBaoCaoModal');
    const xacNhanXoaModal = new bootstrap.Modal('#xacNhanXoaModal');
    const xemBaoCaoCuModal = new bootstrap.Modal('#xemBaoCaoCuModal');
    const mtdCanhBaoModal = new bootstrap.Modal('#mtdCanhBaoModal');
    const danBaoCaoModalEl = document.getElementById('danBaoCaoModal');
    
    const capNhatNutTaoBaoCao = () => {
        const daBaoCao = danhSachFOS.filter(fos => fos.trangThai !== 'Chưa báo cáo').length;
        const tongSo = danhSachFOS.length;
        $('#tao-bao-cao-btn').html(`Tạo & Lưu Báo Cáo (${daBaoCao}/${tongSo})`);
    };

    const veLaiDanhSachFOS = () => {
        if (danhSachFOS.length === 0) {
             $fosListArea.html('<div class="text-center py-3 text-muted">Danh sách trống. Vui lòng thêm FOS.</div>');
             capNhatNutTaoBaoCao();
             return;
        }
        
        let html = '<div class="row g-2">';
        danhSachFOS.forEach(fos => {
            let btnClass = '';
            if (fos.kiemTraTen === false) {
                btnClass = 'name-mismatch';
            } else if (fos.trangThai === 'Đã báo cáo') {
                btnClass = 'reported';
            } else if (fos.trangThai === 'Off') {
                btnClass = 'off';
            }

            html += `
                <div class="col-6">
                    <div class="input-group">
                        <button class="btn fos-name-btn ${btnClass}" data-fos-id="${fos._id}" data-fos-name="${fos.ten}">
                            ${fos.ten}
                        </button>
                        <button class="btn edit-fos-btn" data-fos-id="${fos._id}" data-fos-name="${fos.ten}" title="Sửa báo cáo của ${fos.ten}">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn delete-fos-btn" data-fos-id="${fos._id}" data-fos-name="${fos.ten}" title="Xóa ${fos.ten}">
                            <i class="bi bi-trash3-fill"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        $fosListArea.html(html);
        capNhatNutTaoBaoCao();
    };

    // --- LOCAL STORAGE CACHE ---
    const saveLocalCache = () => {
        const today = dinhDangNgayISO(new Date());
        const data = {
            date: today,
            fosData: danhSachFOS.map(f => ({
                _id: f._id,
                baoCao: f.baoCao,
                trangThai: f.trangThai,
                kiemTraTen: f.kiemTraTen
            })),
            resultText: $('#bao-cao-ket-qua').val()
        };
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data));
    };

    const loadLocalCache = () => {
        const raw = localStorage.getItem(LOCAL_CACHE_KEY);
        if (!raw) return false;
        
        try {
            const data = JSON.parse(raw);
            const today = dinhDangNgayISO(new Date());
            
            if (data.date !== today) {
                localStorage.removeItem(LOCAL_CACHE_KEY);
                return false;
            }
            
            let restoredCount = 0;
            data.fosData.forEach(cachedItem => {
                const fos = danhSachFOS.find(f => f._id === cachedItem._id);
                if (fos && cachedItem.baoCao) {
                    fos.baoCao = cachedItem.baoCao;
                    fos.trangThai = cachedItem.trangThai;
                    fos.kiemTraTen = cachedItem.kiemTraTen;
                    restoredCount++;
                }
            });
            
            if (restoredCount > 0) {
                veLaiDanhSachFOS();
                if(data.resultText) {
                     $('#bao-cao-ket-qua').val(data.resultText);
                     kiemTraMTD(danhSachFOS, baoCaoHomQua, ngayBaoCaoGanNhat);
                } else {
                     taoBaoCao(null, true);
                }
                showStatus(`Đã khôi phục ${restoredCount} báo cáo chưa lưu từ bộ nhớ tạm.`, 'info');
                return true;
            }
        } catch (e) {
            console.error("Cache load error", e);
            localStorage.removeItem(LOCAL_CACHE_KEY);
        }
        return false;
    };

    // --- LOAD DATA ---
    const loadFosFromRestDB = async () => {
        showLoading("Đang tải dữ liệu hệ thống...");
        try {
            // 1. Load Personnel
            await trackApiInteraction();
            const data = await apiCall('nhanvien?h={"$orderby": {"Ten": 1}}');
            setAppMode('online');
            
            danhSachFOS = data.map(item => ({
                _id: item._id,
                ten: item.Ten,
                gioiTinh: item.GioiTinh,
                chiTieu: parseInt(item.ChiTieu, 10) || 50,
                baoCao: '',
                trangThai: 'Chưa báo cáo',
                kiemTraTen: null
            }));
            veLaiDanhSachFOS();
            
            loadLocalCache();
            hideLoading();

            $('#bg-processing-indicator').css('display', 'flex').find('span').text('Đang đồng bộ...');
            refreshDbStats(updateDbWidget);
            await restoreSession();

        } catch (error) {
            console.warn("RestDB failed, trying local backup", error);
            setAppMode('offline');
            updateDbWidget(false, null, null);
            
            try {
                const response = await fetch('fos.txt');
                if (!response.ok) throw new Error("File not found");
                const text = await response.text();
                danhSachFOS = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map((line, index) => {
                        const parts = line.split('|');
                        return {
                            _id: `local_${index}`,
                            ten: parts[0]?.trim() || 'Unknown',
                            gioiTinh: parts[1]?.trim() || 'Nam',
                            chiTieu: parseInt(parts[2]?.trim() || '50', 10),
                            baoCao: '',
                            trangThai: 'Chưa báo cáo',
                            kiemTraTen: null
                        };
                    });
                
                showStatus("Chế độ Offline: Đã tải dữ liệu từ file backup.", "info");
                veLaiDanhSachFOS();
                loadLocalCache();
                hideLoading(); 
            } catch (fileErr) {
                 hideLoading(); 
                 $fosListArea.html('<div class="text-center py-3 text-danger"><i class="bi bi-exclamation-triangle me-1"></i>Lỗi kết nối & Không có dữ liệu backup</div>');
                 showStatus("Lỗi tải dữ liệu: " + error.message, "error");
            }
        } finally {
            hideLoading(); 
            $('#bg-processing-indicator').hide();
            $('#bg-processing-indicator').find('span').text('Đang lưu...');
        }
    };

    const restoreSession = async () => {
        const today = dinhDangNgayISO(new Date());

        try {
            const reports = await apiCall(`report?q={"ngayBaoCao": "${today}"}`);
            if (reports.length > 0) {
                const report = reports[0];
                let restoredCount = 0;
                
                report.baoCaoFOS.forEach(item => {
                    const fos = danhSachFOS.find(f => f.ten === item.tenNhanVien);
                    if (fos && fos.baoCao === '') {
                        const offState = item.OFF;
                        if (offState !== undefined) {
                            if (offState === 0) {
                                fos.trangThai = 'Đã báo cáo';
                                if (item.rawReport) {
                                    fos.baoCao = item.rawReport;
                                } else {
                                     const mtd = item.chiSoHieuSuat.saleTrongThang;
                                     const todaySale = item.chiSoHieuSuat.saleHomNay;
                                     fos.baoCao = `Fos ${item.tenNhanVien} (Khôi phục)\nTổng MC: ${todaySale}\nMTD MC: ${mtd}`;
                                }
                            } else {
                                fos.trangThai = 'Off';
                                const reason = (offState === 1 || offState === '1') ? 'OFF' : offState;
                                fos.baoCao = `Fos ${item.tenNhanVien} ${reason}`;
                            }
                        } else {
                            if (item.rawReport) {
                                fos.baoCao = item.rawReport;
                                fos.trangThai = item.rawReport.includes('OFF') ? 'Off' : 'Đã báo cáo';
                            } else {
                                const mtd = item.chiSoHieuSuat.saleTrongThang;
                                const todaySale = item.chiSoHieuSuat.saleHomNay;
                                if (todaySale === 0 && mtd === 0) {
                                     fos.baoCao = `Fos ${item.tenNhanVien} (Khôi phục)\nTổng MC: ${todaySale}\nMTD MC: ${mtd}`;
                                     fos.trangThai = 'Đã báo cáo';
                                } else {
                                    fos.baoCao = `Fos ${item.tenNhanVien} (Khôi phục)\nTổng MC: ${todaySale}\nMTD MC: ${mtd}`;
                                    fos.trangThai = 'Đã báo cáo';
                                }
                            }
                        }
                        restoredCount++;
                    }
                });
                
                if (restoredCount > 0) {
                    showStatus(`Đã đồng bộ ${restoredCount} báo cáo từ server.`, 'info');
                    veLaiDanhSachFOS();
                    taoBaoCao(null, true);
                }
            }
        } catch (e) { console.warn("Không thể khôi phục phiên hôm nay", e); }

        try {
            const query = `{"ngayBaoCao": {"$lt": "${today}"}}`;
            const hint = `{"$orderby": {"ngayBaoCao": -1}}`;
            const oldReports = await apiCall(`report?q=${query}&h=${hint}&max=1`);
            
            if (oldReports.length > 0) {
                baoCaoHomQua = oldReports[0];
                ngayBaoCaoGanNhat = baoCaoHomQua.ngayBaoCao;
                const dateOfOldReport = dinhDangNgay(ngayBaoCaoGanNhat);

                const formattedOldData = baoCaoHomQua.baoCaoFOS.map(item => ({
                    ten: item.tenNhanVien,
                    mtdMC: item.chiSoHieuSuat.saleTrongThang
                }));
                
                baoCaoHomQua.fosData = formattedOldData; 
                
                let textBaoCaoCu = `Dữ liệu ngày ${dateOfOldReport} (Gần nhất):\n`;
                formattedOldData.forEach(f => {
                     textBaoCaoCu += `${f.ten}: MTD ${f.mtdMC || 0}\n`;
                });
                $('#bao-cao-cu-ket-qua').val(textBaoCaoCu);
            }
        } catch (e) { console.warn("Không tìm thấy báo cáo cũ", e); }
    };

    const saveReportToRestDB = async (payload, isBackground = false) => {
        if (getAppMode() === 'offline') {
            showStatus("Chế độ Offline: Đã lưu báo cáo vào bộ nhớ trình duyệt.", "info");
            return;
        }

        if (isBackground) {
            $('#bg-processing-indicator').css('display', 'flex');
        } else {
            showLoading("Đang lưu báo cáo lên Server...");
        }

        try {
            const check = await apiCall(`report?q={"ngayBaoCao": "${payload.ngayBaoCao}"}`);
            
            if (check.length > 0) {
                const id = check[0]._id;
                await apiCall(`report/${id}`, 'PUT', payload);
                showStatus("Đã cập nhật báo cáo thành công!");
            } else {
                await apiCall('report', 'POST', payload);
                showStatus("Đã tạo mới báo cáo thành công!");
            }
            refreshDbStats(updateDbWidget);
        } catch (error) {
            console.error(error);
            showStatus(`Lỗi khi lưu báo cáo: ${error.message}`, 'error');
        } finally {
            if (isBackground) {
                $('#bg-processing-indicator').hide();
            } else {
                hideLoading();
            }
        }
    };
    
    // --- MAIN LOGIC ---
    const xuLyBaoCaoHangLoat = () => {
        const bulkText = $('#noi-dung-nhieu-bao-cao-modal').val().trim();
        if (!bulkText) {
            showStatus('Vui lòng dán nội dung báo cáo.', 'error');
            return;
        }
        const reportBlocks = bulkText.split(/(?=^Fos\s)/im); 
        let successCount = 0;
        let notFoundNames = [];
        const updatedFosNames = new Set();

        reportBlocks.forEach(block => {
            const trimmedBlock = block.trim();
            if (trimmedBlock.length === 0) return;
            const nameMatch = trimmedBlock.match(/^Fos\s+([^\s]+)/i);
            const reportFosName = nameMatch ? nameMatch[1] : null;

            let foundFos = danhSachFOS.find(fos => {
                const escapedFosName = fos.ten.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const fosNameRegex = new RegExp(`^Fos\\s+${escapedFosName}(?=\\s|$)`, 'i');
                return fosNameRegex.test(trimmedBlock);
            });
            
            if (foundFos) {
                foundFos.baoCao = trimmedBlock;
                foundFos.trangThai = 'Đã báo cáo';
                kiemTraTenNhanVien(foundFos, trimmedBlock);
                if (!updatedFosNames.has(foundFos.ten)) {
                    successCount++;
                    updatedFosNames.add(foundFos.ten);
                }
            } else if (reportFosName) {
                 notFoundNames.push(reportFosName);
            }
        });

        danNhieuBaoCaoModal.hide();
        veLaiDanhSachFOS();
        saveLocalCache(); 
        
        let resultMessage = `Xử lý hoàn tất!<br>- Cập nhật thành công: ${successCount} FOS.`;
        if (notFoundNames.length > 0) {
            const uniqueNotFound = [...new Set(notFoundNames)];
            resultMessage += `<br>- Không tìm thấy/tên sai: ${uniqueNotFound.join(', ')}.`;
        }
        showStatus(resultMessage, notFoundNames.length > 0 ? 'info' : 'success');
        $('#noi-dung-nhieu-bao-cao-modal').val('');
    };

    const taoBaoCao = (e, isDryRun = false) => {
        danhSachFOS.sort((a, b) => b.chiTieu - a.chiTieu);
        veLaiDanhSachFOS();

        const tenQuanLy = 'TNH';
        const ngayBaoCao = dinhDangNgay(new Date());
        
        let tongFOS = danhSachFOS.length;
        let tongMC = 0, tongNTB = 0, tongETB = 0, activeFOS = 0, tongPosThucHien = 0;
        let tongAEPlus = 0;
        const posChiTieu = tongFOS * 3;
        let chiTietFOS = [];
        
        const fosDataHomQuaMap = new Map();
        if (baoCaoHomQua && baoCaoHomQua.fosData) {
            baoCaoHomQua.fosData.forEach(fos => fosDataHomQuaMap.set(fos.ten, fos));
        }

        danhSachFOS.forEach(fos => {
            const emoji = fos.gioiTinh === 'Nữ' ? '👵' : '👨';
            const noiDungBaoCao = fos.baoCao;
            const chiTieu = fos.chiTieu || 0;
            
            let mtdHienThi = layGiaTri(noiDungBaoCao, 'MTD MC');

            if (fos.trangThai === 'Off') {
                const fosHomQua = fosDataHomQuaMap.get(fos.ten);
                const mtdHomQua = fosHomQua ? (fosHomQua.mtdMC || 0) : 0;
                if (mtdHienThi === 0) mtdHienThi = mtdHomQua;
                const matchReason = noiDungBaoCao.match(/^Fos\s+\S+\s+(.*)$/i);
                const reason = (matchReason && matchReason[1] && matchReason[1].toUpperCase() !== 'OFF') ? matchReason[1] : 'OFF';
                chiTietFOS.push(`${emoji}${fos.ten}: ${reason}/${mtdHienThi}/${chiTieu}`);
            } else {
                activeFOS++;
                const ntb = layGiaTri(noiDungBaoCao, 'NTB');
                const etb = layGiaTri(noiDungBaoCao, 'ETB');
                const pos = layGiaTri(noiDungBaoCao, 'Pos');
                const aePlus = layGiaTri(noiDungBaoCao, ['AE+', 'AE Plus']);
                
                const mcHomNay = ntb + etb;

                tongMC += mcHomNay;
                tongNTB += ntb;
                tongETB += etb;
                tongPosThucHien += pos;
                tongAEPlus += aePlus;
                
                chiTietFOS.push(`${emoji}${fos.ten}: ${mcHomNay}/${mtdHienThi}/${chiTieu}`);
            }
        });

        const nsbqNTB = (activeFOS > 0) ? (tongNTB / activeFOS).toFixed(2) : '0.00';
        const nsbqETB = (activeFOS > 0) ? (tongETB / activeFOS).toFixed(2) : '0.00';

        let baoCaoCuoiCung = `${tenQuanLy} ngày ${ngayBaoCao}\n`;
        baoCaoCuoiCung += `🔥${tongFOS} FOS – ${tongMC} MC\n`;
        baoCaoCuoiCung += `✅NTB: ${tongNTB}\n`;
        baoCaoCuoiCung += `✅NSBQ NTB: ${nsbqNTB}\n`;
        baoCaoCuoiCung += `✅ETB: ${tongETB}\n`;
        baoCaoCuoiCung += `✅NSBQ ETB: ${nsbqETB}\n`;
        baoCaoCuoiCung += `✅AE+: ${tongAEPlus}\n`;
        baoCaoCuoiCung += `✅Pos: ${tongPosThucHien}/${posChiTieu}\n\n`;
        baoCaoCuoiCung += `⭐️Active ${activeFOS}/${tongFOS}\n`;
        baoCaoCuoiCung += chiTietFOS.join('\n');

        $('#bao-cao-ket-qua').val(baoCaoCuoiCung);
        kiemTraMTD(danhSachFOS, baoCaoHomQua, ngayBaoCaoGanNhat);

        if (!isDryRun) {
            const stats = {
                tongFOS, tongMC, tongNTB, nsbqNTB, tongETB, nsbqETB, tongPosThucHien, posChiTieu, activeFOS, tongAEPlus
            };
            const payload = generateReportPayload(danhSachFOS, baoCaoHomQua, stats);
            saveReportToRestDB(payload, true);
        }
    };

    // --- EVENT HANDLERS ---
    $('.dropdown-menu').on('click', '.theme-option', function(e) {
        e.preventDefault(); e.stopPropagation();
        const theme = $(this).data('theme');
        const mode = $(this).data('mode');
        const themeClass = `theme-${theme}-${mode}`;
        applyTheme(themeClass);
        saveThemePreference(themeClass);
    });
    $('#random-theme-btn').on('click', function(e) {
        e.preventDefault();
        saveThemePreference('random');
        applyRandomTheme();
    });

    $('#luu-fos-btn').on('click', async function() {
        const tenFosMoi = $('#ten-fos-modal').val().trim();
        const gioiTinhMoi = $('#gioi-tinh-modal').val();
        const chiTieuMoi = parseInt($('#chi-tieu-modal').val(), 10) || 0;
        
        if (tenFosMoi && !danhSachFOS.some(fos => fos.ten.toLowerCase() === tenFosMoi.toLowerCase())) {
            if (getAppMode() === 'offline') {
                 danhSachFOS.push({
                    _id: `local_new_${Date.now()}`,
                    ten: tenFosMoi,
                    gioiTinh: gioiTinhMoi,
                    chiTieu: chiTieuMoi,
                    baoCao: '',
                    trangThai: 'Chưa báo cáo',
                    kiemTraTen: null
                });
                themFosModal.hide();
                $('#them-fos-form')[0].reset();
                veLaiDanhSachFOS();
                saveLocalCache();
                showStatus(`Đã thêm FOS ${tenFosMoi} (Offline)!`);
                return;
            }

            showLoading("Đang thêm nhân viên...");
            try {
                await apiCall('nhanvien', 'POST', {
                    Ten: tenFosMoi,
                    GioiTinh: gioiTinhMoi,
                    ChiTieu: chiTieuMoi
                });
                themFosModal.hide();
                $('#them-fos-form')[0].reset();
                showStatus(`Đã thêm FOS ${tenFosMoi} thành công!`);
                loadFosFromRestDB(); 
            } catch (e) {
                showStatus("Lỗi thêm FOS: " + e.message, 'error');
            } finally {
                hideLoading();
            }
        } else if (!tenFosMoi) {
            showStatus('Vui lòng nhập tên FOS.', 'error');
        } else {
            showStatus('Tên FOS đã tồn tại!', 'error');
        }
    });
    
    $fosListArea.on('click', '.delete-fos-btn', function() {
        fosCanXoa = { id: $(this).data('fos-id'), name: $(this).data('fos-name') };
        $('#xacNhanXoaModal .modal-body').text(`Bạn có chắc chắn muốn xoá FOS "${fosCanXoa.name}" khỏi cơ sở dữ liệu không?`);
        xacNhanXoaModal.show();
    });

    $('#xac-nhan-xoa-btn').on('click', async function() {
        if (fosCanXoa && fosCanXoa.id) {
             if (getAppMode() === 'offline') {
                 danhSachFOS = danhSachFOS.filter(f => f._id !== fosCanXoa.id);
                 veLaiDanhSachFOS();
                 saveLocalCache();
                 showStatus(`Đã xoá ${fosCanXoa.name} (Offline)!`);
                 fosCanXoa = null;
                 xacNhanXoaModal.hide();
                 return;
             }

            showLoading("Đang xoá...");
            try {
                await apiCall(`nhanvien/${fosCanXoa.id}`, 'DELETE');
                showStatus(`Đã xoá ${fosCanXoa.name} thành công!`);
                loadFosFromRestDB();
            } catch (e) {
                showStatus("Lỗi xoá FOS: " + e.message, 'error');
            } finally {
                hideLoading();
            }
            fosCanXoa = null;
        }
        xacNhanXoaModal.hide();
    });
    
    $fosListArea.on('click', '.fos-name-btn', function() {
        fosHienTai = $(this).data('fos-name');
        const fosData = danhSachFOS.find(fos => fos.ten === fosHienTai);
        if (fosData) {
            $('#danBaoCaoModalLabel').text(`Báo cáo của ${fosHienTai}`);
            $('#noi-dung-bao-cao-modal').val(fosData.baoCao);
            danBaoCaoModal.show();
        }
    });
    
    danBaoCaoModalEl.addEventListener('shown.bs.modal', () => {
        $('#noi-dung-bao-cao-modal').focus().select();
        $('#ly-do-off-input').val('');
    });

    $('#luu-bao-cao-btn').on('click', function() {
        const fosData = danhSachFOS.find(fos => fos.ten === fosHienTai);
        if (fosData) {
            const noiDungBaoCao = $('#noi-dung-bao-cao-modal').val();
            fosData.baoCao = noiDungBaoCao;
            fosData.trangThai = 'Đã báo cáo';
            kiemTraTenNhanVien(fosData, noiDungBaoCao);
            veLaiDanhSachFOS();
            saveLocalCache();
            danBaoCaoModal.hide();
        }
    });
    
    $('#noi-dung-bao-cao-modal').on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#luu-bao-cao-btn').click();
        }
    });

    const setFosOff = (reason = '') => {
        const fosData = danhSachFOS.find(fos => fos.ten === fosHienTai);
        if (fosData) {
            let reportText = '';
            if (reason.trim()) {
                reportText = `Fos ${fosData.ten} ${reason.trim()}`;
            } else {
                 reportText = `Fos ${fosData.ten} OFF`;
            }
            
            fosData.baoCao = reportText;
            fosData.trangThai = 'Off';
            fosData.kiemTraTen = null;
            veLaiDanhSachFOS();
            saveLocalCache();
            danBaoCaoModal.hide();
        }
    }

    $('#danh-dau-off-btn').on('click', function() {
        setFosOff('');
    });
    
    $('#luu-off-co-ly-do-btn').on('click', function() {
        const reason = $('#ly-do-off-input').val();
        setFosOff(reason);
    });

    $fosListArea.on('click', '.edit-fos-btn', function() {
        fosHienTai = $(this).data('fos-name');
        const fosData = danhSachFOS.find(fos => fos.ten === fosHienTai);
        if (fosData) {
            $('#suaBaoCaoModalTitleText').text(`Chỉnh sửa báo cáo của ${fosHienTai}`);
            const noiDungBaoCao = fosData.baoCao;
            const ntb = layGiaTri(noiDungBaoCao, 'NTB');
            const etb = layGiaTri(noiDungBaoCao, 'ETB');
            $('#mc-edit-display').text(ntb + etb);
            $('#ntb-edit-modal').val(ntb);
            $('#etb-edit-modal').val(etb);
            $('#pos-edit-modal').val(layGiaTri(noiDungBaoCao, 'Pos'));
            $('#aeplus-edit-modal').val(layGiaTri(noiDungBaoCao, ['AE+', 'AE Plus']));
            $('#saleapp-edit-modal').val(layGiaTri(noiDungBaoCao, ['Saleapp', 'SL nhập saleapp']));
            $('#cskh-edit-modal').val(layGiaTri(noiDungBaoCao, ['CSKH', 'SL gọi chăm sóc KH']));
            $('#ca-edit-modal').val(layGiaTri(noiDungBaoCao, 'CA'));
            $('#soundbox-edit-modal').val(layGiaTri(noiDungBaoCao, 'Soundbox'));
            $('#mtd-edit-modal').val(layGiaTri(noiDungBaoCao, 'MTD MC'));
            suaBaoCaoModal.show();
        }
    });
    
    $('#xu-ly-nhieu-bao-cao-btn').on('click', xuLyBaoCaoHangLoat);
    $('#sua-bao-cao-form').on('input', '#ntb-edit-modal, #etb-edit-modal', function() {
        const ntb = parseInt($('#ntb-edit-modal').val(), 10) || 0;
        const etb = parseInt($('#etb-edit-modal').val(), 10) || 0;
        $('#mc-edit-display').text(ntb + etb);
    });
     $('#sua-bao-cao-form').on('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName.toLowerCase() !== 'textarea') {
            e.preventDefault();
            $('#luu-sua-bao-cao-btn').click();
        }
    });

    $('#luu-sua-bao-cao-btn').on('click', function() {
        const fosData = danhSachFOS.find(fos => fos.ten === fosHienTai);
        if (fosData) {
            const ntb = $('#ntb-edit-modal').val() || 0;
            const etb = $('#etb-edit-modal').val() || 0;
            const mc = (parseInt(ntb, 10) || 0) + (parseInt(etb, 10) || 0);
            const pos = $('#pos-edit-modal').val() || 0;
            const aeplus = $('#aeplus-edit-modal').val() || 0;
            const saleapp = $('#saleapp-edit-modal').val() || 0;
            const cskh = $('#cskh-edit-modal').val() || 0;
            const ca = $('#ca-edit-modal').val() || 0;
            const soundbox = $('#soundbox-edit-modal').val() || 0;
            const mtd_mc = $('#mtd-edit-modal').val() || 0;

            const baoCaoMoi = `Fos ${fosData.ten}\n` +
                             `Tổng MC: ${mc}\n` +
                             `NTB: ${ntb}\n` +
                             `ETB: ${etb}\n` +
                             `AE+: ${aeplus}\n` + 
                             `Pos: ${pos}\n` +
                             `Saleapp: ${saleapp}\n` +
                             `CSKH: ${cskh}\n` +
                             `CA: ${ca}\n` +
                             `Soundbox: ${soundbox}\n` +
                             `MTD MC: ${mtd_mc}`;

            fosData.baoCao = baoCaoMoi;
            fosData.trangThai = 'Đã báo cáo';
            kiemTraTenNhanVien(fosData, baoCaoMoi);
            veLaiDanhSachFOS();
            saveLocalCache();
            suaBaoCaoModal.hide();
        }
    });
    
    const pasteFromClipboard = async (targetSelector) => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim().length > 0) {
                $(targetSelector).val(text);
                $(targetSelector).focus();
                showStatus('Đã dán nội dung từ clipboard!', 'success');
            } else {
                showStatus('Clipboard trống hoặc không phải văn bản.', 'error');
            }
        } catch (err) {
            console.error('Clipboard error:', err);
            showStatus('Không thể đọc clipboard. Hãy cấp quyền hoặc dán thủ công (Ctrl+V).', 'error');
        }
    };

    $('#paste-single-btn').on('click', () => pasteFromClipboard('#noi-dung-bao-cao-modal'));
    $('#paste-bulk-btn').on('click', () => pasteFromClipboard('#noi-dung-nhieu-bao-cao-modal'));

    $('#tao-bao-cao-btn').on('click', (e) => taoBaoCao(e, false));
    
    $('#sao-chep-btn').on('click', function() {
        const text = $('#bao-cao-ket-qua').val();
        navigator.clipboard.writeText(text).then(function() {
            const btn = $('#sao-chep-btn');
            btn.html('<i class="bi bi-check2"></i> Đã sao chép');
            btn.addClass('copied');
            setTimeout(() => {
                btn.html('<i class="bi bi-clipboard"></i> Sao chép');
                btn.removeClass('copied');
            }, 2000);
            showStatus('Đã sao chép vào bộ nhớ tạm!', 'success');
        });
    });
    
    $('#xem-bao-cao-cu-btn').on('click', function() {
        xemBaoCaoCuModal.show();
    });
    
    // START
    initializeTheme();
    buildThemeMenu();
    loadFosFromRestDB(); 
});
