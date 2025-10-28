document.addEventListener('DOMContentLoaded', function () {
    const externalserver = 'https://stream.proctorlink.com';
    const iframe = document.querySelector('.teacher-iframe-container iframe');
    
    if (iframe) {
        iframe.addEventListener('load', function () {
            setTimeout(() => {
                const lang = document.documentElement.getAttribute('lang') || 'en';
                console.log('Detected language', lang);

                iframe.contentWindow.postMessage({
                    type: 'init',
                    lang: lang
                }, '*');
            }, 2000);
        });
    }
});
