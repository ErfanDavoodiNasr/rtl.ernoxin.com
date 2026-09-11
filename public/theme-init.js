(function () {
    try {
        var t = localStorage.getItem('arnooxine-theme')
        if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
        else if (window.matchMedia('(prefers-color-scheme: light)').matches)
            document.documentElement.setAttribute('data-theme', 'light')
        else document.documentElement.setAttribute('data-theme', 'dark')
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark')
    }
})()
