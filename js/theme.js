
const themes = {
    'ios18': 'iOS 18',
    'oneui': 'OneUI',
    'window11': 'Window 11',
    'pastel': 'Pastel Dream',
    'nature': 'Serene Nature',
    'gaming': 'Gaming Zone',
    'carbon': 'Carbon Fiber',
    'chic': 'Chic & Modern',
};

export const buildThemeMenu = () => {
    const menu = $('.dropdown-submenu > .dropdown-menu');
    menu.empty();
    for (const key in themes) {
        const name = themes[key];
        menu.append(`
            <li class="dropdown-submenu">
                <a class="dropdown-item" href="#">${name}</a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item theme-option" href="#" data-theme="${key}" data-mode="light">Chế độ Sáng</a></li>
                    <li><a class="dropdown-item theme-option" href="#" data-theme="${key}" data-mode="dark">Chế độ Tối</a></li>
                </ul>
            </li>
        `);
    }
};

export const applyTheme = (themeClass) => {
    const classes = $('body').attr('class').split(' ');
    for (let cls of classes) {
        if (cls.startsWith('theme-')) {
            $('body').removeClass(cls);
        }
    }
    $('body').addClass(themeClass);
};

export const saveThemePreference = (preference) => {
    localStorage.setItem('appTheme', preference);
};

export const applyRandomTheme = () => {
    const themeKeys = Object.keys(themes);
    const randomThemeKey = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    const randomMode = Math.random() < 0.5 ? 'light' : 'dark';
    const randomThemeClass = `theme-${randomThemeKey}-${randomMode}`;
    applyTheme(randomThemeClass);
};

export const initializeTheme = () => {
    const savedPreference = localStorage.getItem('appTheme') || 'theme-ios18-light';
    if (savedPreference === 'random') {
        applyRandomTheme();
    } else {
        applyTheme(savedPreference);
    }
};
