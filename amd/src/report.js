define(['jquery', 'core/modal_factory', 'core/modal_events', 'core/templates', 'core/str', 'core/notification'],
function($, ModalFactory, ModalEvents, Templates, str, notification) {
    return {
        init: function() {
            $(document).ready(function() {
                if (typeof lightbox !== 'undefined') {
                    lightbox.init();
                }
                $('.delcourse').show();
                $('.delete-icon').show();
                $('.delete-quiz').show();
            });
            $('.delete-icon').on('click', function(event) {
                event.preventDefault();
                var username = $(this).data('username');
                var cmid = $(this).data('cmid');
                var quizid = $(this).data('quizid');
                var userid = $(this).data('userid');
                var newUrl = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/proctoringreport.php?delete='
                + userid + '&cmid=' + cmid + '&quizid=' + quizid;
                Promise.all([
                    str.get_string('deleteallimagesuser', 'quizaccess_quizproctoring', username),
                    str.get_string('confirmation', 'quizaccess_quizproctoring'),
                    str.get_string('deleteallimages', 'quizaccess_quizproctoring'),
                    str.get_string('delete', 'moodle'),
                    str.get_string('cancel', 'moodle'),
                ]).then(function(strings) {
                    var message = strings[0];
                    var title = strings[1];
                    var checkboxtext = strings[2];
                    var deleteLabel = strings[3];
                    var cancelLabel = strings[4];
                    var checkboxHtml = '<div><input type="checkbox" id="deleteallimages" /><label class="deleteall">'
                    + checkboxtext + '</label></div>';
                    notification.confirm(
                        title,
                        message + checkboxHtml,
                        deleteLabel,
                        cancelLabel,
                        function() {
                            var allImages = $('#deleteallimages').is(':checked');
                            if (allImages) {
                                newUrl += '&all=true';
                            }
                            window.location.href = newUrl;
                        },
                        function() {
                            // Do nothing on 'Cancel'
                        }
                    );
                });
            });

            $('.delete-quiz').on('click', function(event) {
                event.preventDefault();
                var quizname = $(this).data('quiz');
                var cmid = $(this).data('cmid');
                var quizid = $(this).data('quizid');
                var newUrl = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/imagesreport.php?cmid='
                + cmid + '&delete=' + quizid;
                Promise.all([
                    str.get_string('deleteallimagesquiz', 'quizaccess_quizproctoring', quizname),
                    str.get_string('confirmation', 'quizaccess_quizproctoring'),
                    str.get_string('deleteallimages', 'quizaccess_quizproctoring'),
                    str.get_string('delete', 'moodle'),
                    str.get_string('cancel', 'moodle'),
                ]).then(function(strings) {
                    var message = strings[0];
                    var title = strings[1];
                    var checkboxtext = strings[2];
                    var deleteLabel = strings[3];
                    var cancelLabel = strings[4];
                    var checkboxHtml = '<div><input type="checkbox" id="deleteallimages" /><label class="deleteall">'
                    + checkboxtext + '</label></div>';
                    notification.confirm(
                        title,
                        message + checkboxHtml,
                        deleteLabel,
                        cancelLabel,
                        function() {
                            var allImages = $('#deleteallimages').is(':checked');
                            if (allImages) {
                                newUrl += '&all=true';
                            }
                            window.location.href = newUrl;
                        },
                        function() {
                            // Do nothing on 'Cancel'
                        }
                    );
                });
            });

            $('.delcourse').on('click', function(event) {
                event.preventDefault();
                var coursename = $(this).data('course');
                var cmid = $(this).data('cmid');
                var courseid = $(this).data('courseid');
                var newUrl = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/imagesreport.php?cmid='
                + cmid + '&delcourse=' + courseid;
                Promise.all([
                    str.get_string('deleteallimagescourse', 'quizaccess_quizproctoring', coursename),
                    str.get_string('confirmation', 'quizaccess_quizproctoring'),
                    str.get_string('deleteallimages', 'quizaccess_quizproctoring'),
                    str.get_string('delete', 'moodle'),
                    str.get_string('cancel', 'moodle'),
                ]).then(function(strings) {
                    var message = strings[0];
                    var title = strings[1];
                    var checkboxtext = strings[2];
                    var deleteLabel = strings[3];
                    var cancelLabel = strings[4];
                    var checkboxHtml = '<div><input type="checkbox" id="deleteallimages" /><label class="deleteall">'
                    + checkboxtext + '</label></div>';
                    notification.confirm(
                        title,
                        message + checkboxHtml,
                        deleteLabel,
                        cancelLabel,
                        function() {
                            var allImages = $('#deleteallimages').is(':checked');
                            if (allImages) {
                                newUrl += '&all=true';
                            }
                            window.location.href = newUrl;
                        },
                        function() {
                            // Do nothing on 'Cancel'
                        }
                    );
                });
            });

            $('.proctoringimage').on('click', function(event) {
                event.preventDefault();
                var attemptid = $(this).data('attemptid');
                var quizid = $(this).data('quizid');
                var userid = $(this).data('userid');
                var startdate = $(this).data('startdate');
                var all = $('#storeallimages').is(':checked') ? 'true' : 'false';
           
                $.ajax({
                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_report.php',
                    data: {
                        attemptid: attemptid,
                        userid: userid,
                        quizid: quizid,
                        all: all,
                    },
                    dataType: 'json',
                    success: function(response) {
                        var images = JSON.parse(JSON.stringify(response));
                        if (images.length > 0) {
                            var data = {
                                attemptdate: startdate,
                                images: images.map(function(image) {
                                    return {
                                        url: image.img,
                                        time: image.timecreated,
                                        title: image.title,
                                        status: image.imagestatus,
                                        cssClass: (function() {
                                            switch (image.imagestatus.toLowerCase()) {
                                                case 'main image':
                                                    return 'main-image';
                                                case 'warning':
                                                    return 'warning-image';
                                                default:
                                                    return 'green-image';
                                            }
                                        })()
                                    };
                                })
                            };

                            Templates.render('quizaccess_quizproctoring/response_modal', data)
                                .done(function(renderedHtml) {
                                    var modaltitle = all === 'true' ? M.util.get_string('allimages', 'quizaccess_quizproctoring') :
                                    M.util.get_string('proctoringimages', 'quizaccess_quizproctoring');
                                    ModalFactory.create({
                                    type: ModalFactory.types.DEFAULT,
                                    body: renderedHtml,
                                    title: modaltitle,
                                    large: true,
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
                                body: message,
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
