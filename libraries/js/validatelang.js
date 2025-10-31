document.addEventListener('DOMContentLoaded', function() {
    const iframe = document.querySelector('.teacher-iframe-container iframe');

    if (iframe) {
        iframe.addEventListener('load', function() {
            setTimeout(() => {
                const lang = document.documentElement.getAttribute('lang') || 'en';

                iframe.contentWindow.postMessage({
                    type: 'init',
                    lang: lang
                }, '*');
            }, 2000);
        });
    }
});
