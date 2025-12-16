
export const showStatus = (msg, type = 'success') => {
    let bg = "linear-gradient(to right, #00b09b, #96c93d)"; // Success Green
    if (type === 'danger' || type === 'error') {
        bg = "linear-gradient(to right, #ff5f6d, #ffc371)"; // Error Red
    } else if (type === 'info') {
        bg = "linear-gradient(to right, #2193b0, #6dd5ed)"; // Info Blue
    }

    if (window.Toastify) {
        window.Toastify({
            text: msg,
            duration: 3000,
            gravity: "bottom", // `top` or `bottom`
            position: "right", // `left`, `center` or `right`
            stopOnFocus: true, // Prevents dismissing of toast on hover
            style: {
                background: bg,
                borderRadius: "12px",
                boxShadow: "0 5px 15px rgba(0,0,0,0.15)",
                fontFamily: "'Poppins', sans-serif",
                padding: "12px 20px",
                fontWeight: "500",
                fontSize: "0.9rem"
            },
            onClick: function(){} // Callback after click
        }).showToast();
    } else {
        console.log(`[${type}] ${msg}`);
    }
};

export const showLoading = (text = "Đang xử lý...") => {
    $('#loading-text').text(text);
    $('#loading-overlay').css('display', 'flex');
};

export const hideLoading = () => {
    $('#loading-overlay').hide();
};

export const dinhDangNgay = (date) => {
     const d = new Date(date);
     const ngay = String(d.getDate()).padStart(2, '0');
     const thang = String(d.getMonth() + 1).padStart(2, '0');
     const nam = d.getFullYear();
     return `${ngay}/${thang}/${nam}`;
};

export const dinhDangNgayISO = (date) => {
    const d = new Date(date);
    const nam = d.getFullYear();
    const thang = String(d.getMonth() + 1).padStart(2, '0');
    const ngay = String(d.getDate()).padStart(2, '0');
    return `${nam}-${thang}-${ngay}`;
};

export const layGiaTri = (noiDung, tuKhoa) => {
    if (!noiDung) return 0;
    const keywords = Array.isArray(tuKhoa) ? tuKhoa : [tuKhoa];
    for (const key of keywords) {
        const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedKey + '\\s*[: ]\\s*(\\d+)', 'i');
        const match = noiDung.match(regex);
        if (match) return parseInt(match[1], 10);
    }
    return 0;
};
