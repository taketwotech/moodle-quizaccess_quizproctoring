define(['jquery', 'core/modal_factory', 'core/modal_events', 'core/templates'],
function($, ModalFactory, ModalEvents, Templates) {
    return {
        init: function() {
            $(document).ready(function() {
                if (typeof lightbox !== 'undefined') {
                    lightbox.init();
                }
            });

            $('.delete-icon').on('click', function(event) {
                var username = $(this).data('username');
                var confirmation = confirm('Delete all the Images of user "' + username + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });

            $('.delete-quiz').on('click', function(event) {
                var quizname = $(this).data('quiz');
                var confirmation = confirm('Delete all the Images of quiz "' + quizname + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });

            $('.delcourse').on('click', function(event) {
                var coursename = $(this).data('course');
                var confirmation = confirm('Delete all the Images of course "' + coursename + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });

            $('.proctoringimage').on('click', function(event) {
                event.preventDefault();
                var attemptid = $(this).data('attemptid');
                var quizid = $(this).data('quizid');
                var userid = $(this).data('userid');
                var all = $(this).data('all');
                $.ajax({
                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_report.php',
                    data: {
                        attemptid: attemptid,
                        userid: userid,
                        quizid: quizid,
                        all: all
                    },
                    dataType: 'json',
                    success: function(response) {
                        var images = JSON.parse(JSON.stringify(response));
                        if (images.length > 0) {
                            var data = {
                                images: images.map(function(image) {
                                    return {
                                        url: image.img,
                                        time: image.timecreated,
                                        title: image.title
                                    };
                                })
                            };

                            Templates.render('quizaccess_quizproctoring/response_modal', data)
                                .done(function(renderedHtml) {
                                    ModalFactory.create({
                                    type: ModalFactory.types.DEFAULT,
                                    body: renderedHtml,
                                    title: M.util.get_string('proctoringimages', 'quizaccess_quizproctoring')
                                }).then(function(modal) {
                                    modal.getRoot().on(ModalEvents.hidden, modal.destroy.bind(modal));
                                    modal.show();
                                    lightbox.init();
                                    $('.image-link').on('click', function() {
                                        var titleElement = $(this).next('.image-title');
                                        var timeElement = $(this).next('.image-time');
                                        titleElement.show();
                                        timeElement.show();                                        
                                        lightbox.start($(this)[0]);
                                    });
                                    $('.image-link').on('lightbox:open', function() {
                                        $(this).next('.image-title').hide();
                                    });
                                });
                            });
                        } else {
                            var message = M.util.get_string('noimageswarning', 'quizaccess_quizproctoring');
                            ModalFactory.create({
                                type: ModalFactory.types.DEFAULT,
                                body: message
                            }).then(function(modal) {
                                modal.getRoot().on(ModalEvents.hidden, modal.destroy.bind(modal));
                                modal.show();
                            });
                        }
                    }
                });
            });

            $('.proctoridentity').on('click', function(event) {
                event.preventDefault();
                $.ajax({
                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/proctoridentity.php',
                    data: {
                        attemptid: $(this).data('attemptid'),
                        userid: $(this).data('userid'),
                        quizid: $(this).data('quizid')
                    },
                    dataType: 'json',
                    success: function(response) {
                        var residentity = JSON.parse(JSON.stringify(response));
                        if (residentity.success) {
                            window.open(residentity.url, "_blank");
                        } else {
                            return ModalFactory.create({
                                type: ModalFactory.types.DEFAULT,
                                body: residentity.message,
                            }).then(function(modal) {
                                modal.getRoot().on(ModalEvents.hidden, modal.destroy.bind(modal));
                                modal.show();
                                return null;
                            });
                        }
                        return true;
                    }
                });
            });
        }
    };
});
