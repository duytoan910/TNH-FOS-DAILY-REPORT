
export const dinhDangNgayHienThi = (d) => {
    const n = new Date(d);
    return `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`;
};

export const dinhDangNgayISO = (d) => {
    const n = new Date(d);
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
};

export const trichXuatSoLieu = (nd, tk) => {
    if (!nd) return 0;
    const tks = Array.isArray(tk) ? tk : [tk];
    for (const t of tks) {
        const r = new RegExp(t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*[: ]\\s*(\\d+)', 'i');
        const m = nd.match(r);
        if (m) return parseInt(m[1]);
    }
    return 0;
};

export const hienThiThongBao = (noiDung, loai = 'success') => {
    if (window.Toastify) {
        window.Toastify({
            text: noiDung,
            duration: 3000,
            gravity: "bottom",
            position: "right",
            style: { 
                background: loai === 'error' ? "linear-gradient(to right, #ff5f6d, #ffc371)" : "linear-gradient(to right, #00b09b, #96c93d)",
                borderRadius: "10px" 
            }
        }).showToast();
    }
};
