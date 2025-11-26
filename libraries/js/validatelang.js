document.addEventListener('DOMContentLoaded', function () {
    require(['jquery'], function($) {
        const iframe = document.querySelector('.teacher-iframe-container iframe');
        
        if (!iframe) return;

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

        window.addEventListener('message', function (event) {
            const data = event.data;
            console.log('Received message from iframe:', data);

            if (data && data.type === 'proctoring-eye-status') {
                $.ajax({
                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_sendalert.php',
                    method: 'POST',
                    data: {
                        eyeoff: true,
                        attemptid: data.attemptid
                    },
                    success: function(response) {
                        if (response) {
                            iframe.contentWindow.postMessage({
                                type: 'proctoring-eye-status-response',
                                eyeoffstatus: response.eyeoffdisable,
                                attemptid: data.attemptid
                            }, '*');
                        }
                    },
                });
            }
        });
    });
});