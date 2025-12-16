
import { DB_URL, DB_HEADERS } from './config.js';
import { dinhDangNgayISO } from './utils.js';

let appMode = 'online';

export const setAppMode = (mode) => {
    appMode = mode;
};

export const getAppMode = () => {
    return appMode;
};

export const apiCall = async (endpoint, method = 'GET', data = null) => {
    // Note: Tracking logic is handled in the main app to avoid circular dependencies or moved here if self-contained
    const options = {
        method: method,
        headers: DB_HEADERS
    };
    if (data) {
        options.body = JSON.stringify(data);
    }
    const response = await fetch(`${DB_URL}/${endpoint}`, options);
    // updateApiUsage(response.headers); 
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errText}`);
    }
    return response.json();
};

export const trackApiInteraction = async () => {
    if (appMode === 'offline') return;

    const today = dinhDangNgayISO(new Date());
    
    try {
        const settings = await apiCall(`setting?max=1`);
        
        if (settings.length > 0) {
            const setting = settings[0];
            let newCount = (setting.connectionCount || 0) + 1;
            
            if (setting.date !== today) {
                newCount = 1;
            }
            
            $('#db-api-usage').text(`(${newCount})`);

            await apiCall(`setting/${setting._id}`, 'PUT', { 
                connectionCount: newCount,
                date: today 
            });
        } else {
             $('#db-api-usage').text(`(1)`);
            await apiCall('setting', 'POST', {
                connectionCount: 1,
                date: today
            });
        }
    } catch (e) {
        console.warn("Tracking failed (non-critical):", e);
    }
};

export const refreshDbStats = async (updateWidgetCallback) => {
    try {
        const headers = { ...DB_HEADERS };
        
        const resReport = await fetch(`${DB_URL}/report?q={}&h={"$fields":{"_id":1}}`, {method: 'GET', headers: headers});
        if (!resReport.ok) throw new Error("Connection failed");
        const reportIds = await resReport.json();
        
        const resNv = await fetch(`${DB_URL}/nhanvien?q={}&h={"$fields":{"_id":1}}`, {method: 'GET', headers: headers});
        const nvIds = await resNv.json();
        
        const resSetting = await fetch(`${DB_URL}/setting?max=1`, {method: 'GET', headers: headers});
        const settings = await resSetting.json();
        let connCount = 0;
        if(settings.length > 0) {
            const s = settings[0];
            const today = dinhDangNgayISO(new Date());
            if (s.date === today) {
                 connCount = s.connectionCount || 0;
            }
        }
        
        if (updateWidgetCallback) {
            updateWidgetCallback(true, nvIds.length, reportIds.length, connCount);
        }
    } catch (e) {
        console.warn("DB Stat check failed", e);
    }
};
