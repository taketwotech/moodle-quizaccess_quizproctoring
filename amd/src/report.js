define(['jquery', 'core/modal_factory', 'core/modal_events', 'core/templates', 'core/str', 'core/notification'],
function($, ModalFactory, ModalEvents, Templates, str, notification) {
    return {
        init: function() {
            $(document).ready(function() {
                if (typeof lightbox !== 'undefined') {
                    // eslint-disable-next-line no-undef
                    lightbox.init();
                }
            });
            $('#proctoringreporttable').on('click', '.delete-icon', function(event) {
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
                                window.location.href = newUrl;
                            }
                        },
                        function() {
                            // Do nothing on 'Cancel'
                            return;
                        }
                    );
                    setTimeout(function() {
                        $('.modal-footer').addClass('deletenotifbtn');
                        var deleteButton = $('.modal-footer button[data-action="save"]');
                        deleteButton.prop('disabled', true);
                        $(document).off('change', '#deleteallimages').on('change', '#deleteallimages', function() {
                            deleteButton.prop('disabled', !$(this).is(':checked'));
                        });
                    }, 300);
                    return undefined;
                })
                .catch(function() {
                    // Console.log(err);
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
                    var checkboxHtml = '<div><input type="checkbox" id="deleteallimage" /><label class="deleteall">'
                    + checkboxtext + '</label></div>';
                    notification.confirm(
                        title,
                        message + checkboxHtml,
                        deleteLabel,
                        cancelLabel,
                        function() {
                            var allImages = $('#deleteallimage').is(':checked');
                            if (allImages) {
                                newUrl += '&all=true';
                                window.location.href = newUrl;
                            }
                        },
                        function() {
                            // Do nothing on 'Cancel'
                            return;
                        }
                    );
                    setTimeout(function() {
                        $('.modal-footer').addClass('deletenotifbtn');
                        var deleteButton = $('.modal-footer button[data-action="save"]');
                        deleteButton.prop('disabled', true);
                        $(document).off('change', '#deleteallimage').on('change', '#deleteallimage', function() {
                            deleteButton.prop('disabled', !$(this).is(':checked'));
                        });
                    }, 300);
                    return undefined;
                })
                .catch(function() {
                    // Console.log(err);
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
                    var checkboxHtml = '<div><input type="checkbox" id="deleteallimag" /><label class="deleteall">'
                    + checkboxtext + '</label></div>';
                    notification.confirm(
                        title,
                        message + checkboxHtml,
                        deleteLabel,
                        cancelLabel,
                        function() {
                            var allImages = $('#deleteallimag').is(':checked');
                            if (allImages) {
                                newUrl += '&all=true';
                                window.location.href = newUrl;
                            }
                        },
                        function() {
                            // Do nothing on 'Cancel'
                            return;
                        }
                    );
                    setTimeout(function() {
                        $('.modal-footer').addClass('deletenotifbtn');
                        var deleteButton = $('.modal-footer button[data-action="save"]');
                        deleteButton.prop('disabled', true);
                        $(document).off('change', '#deleteallimag').on('change', '#deleteallimag', function() {
                            deleteButton.prop('disabled', !$(this).is(':checked'));
                        });
                    }, 300);
                    return undefined;
                })
                .catch(function() {
                    // Console.log(err);
                });
            });

            $('#attemptsreporttable').on('click', '.proctoringimage', function(event) {
                event.preventDefault();
                var attemptid = $(this).data('attemptid');
                var quizid = $(this).data('quizid');
                var userid = $(this).data('userid');
                var startdate = $(this).data('startdate');
                var all = false;
                var modaltitle = M.util.get_string('proctoringimages', 'quizaccess_quizproctoring');

                ModalFactory.create({
                    type: ModalFactory.types.DEFAULT,
                    body: '<div class="image-content"><p>Loading images...</p></div><div class="pagination-controls"></div>',
                    title: modaltitle,
                    large: true,
                }).then(function(modal) {
                    modal.show();
                    $('.imgcheckbox').prop('checked', false);
                    var storeAllImages = $('#storeallimages').val();
                    var checkboxContainer = `
                        <div class="checkbox-container" style="display: none;">
                            <input type="checkbox" class="imgcheckbox">
                            <label for="checkbox" class="image-checkbox">
                                To view all images saved from the quiz, please select the checkbox.
                            </label>
                        </div>
                    `;
                    modal.getBody().prepend(checkboxContainer);
                    if (storeAllImages === '1') {
                        modal.getBody().find('.checkbox-container').show();
                    } else {
                        modal.getBody().find('.checkbox-container').hide();
                    }
                    var perpage = 35;
                    var currentPage = 1;
                    var totalPages = 1;

                    /**
                     * Load images via AJAX
                     *
                     * @param {int} page page
                     */
                    function loadImages(page) {
                        $.ajax({
                            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_report.php',
                            data: {
                                attemptid: attemptid,
                                userid: userid,
                                quizid: quizid,
                                all: all.toString(),
                                page: page,
                                perpage: perpage,
                            },
                            dataType: 'json',
                            success: function(response) {
                                var images = response.images.map(function(image) {
                                    return {
                                        url: image.img,
                                        title: image.title,
                                        time: image.timecreated,
                                        cssClass: getCssClass(image.imagestatus)
                                    };
                                });
                                totalPages = response.totalPages;

                                var data = {
                                    attemptdate: startdate,
                                    images: images,
                                    currentPage: response.currentPage,
                                    totalPages: response.totalPages,
                                    isFirstPage: response.currentPage === 1,
                                    isLastPage: response.currentPage === response.totalPages,
                                    str: function(key) {
                                        return M.util.get_string(key, 'quizaccess_quizproctoring');
                                    }
                                };

                                modal.getBody().find('.image-content').html('');
                                Templates.render('quizaccess_quizproctoring/response_modal', data)
                                    .done(function(renderedHtml) {
                                        modal.getBody().find('.image-content').html(renderedHtml);
                                        // eslint-disable-next-line no-undef
                                        lightbox.init();
                                        var imagesInThisModal = modal.getBody().find('.image-link');
                                        var totalImages = imagesInThisModal.length;

                                        $('.image-link').on('click', function(event) {
                                            event.preventDefault();
                                            var index = imagesInThisModal.index($(this));
                                            if (index === -1) {
                                                return;
                                            }
                                            $('.lb-caption').each(function() {
                                                if ($(this).next('.lb-num').length === 0) {
                                                    $(this).after('<span class="lb-num"></span>');
                                                }
                                            });
                                            $('.lb-num').text('Image ' + (index + 1) + ' of ' + totalImages);

                                            // eslint-disable-next-line no-undef
                                            lightbox.start($(this));
                                            $('.lb-next, .lb-prev').off('click').on('click', function(event) {
                                                event.preventDefault();
                                                if ($(this).hasClass('lb-next')) {
                                                    index = (index + 1) % totalImages;
                                                } else if ($(this).hasClass('lb-prev')) {
                                                    index = (index - 1 + totalImages) % totalImages;
                                                }
                                                var newImageSrc = imagesInThisModal.eq(index).attr('href');
                                                $('.lb-image').attr('src', newImageSrc);
                                                $('.lb-num').text('Image ' + (index + 1) + ' of ' + totalImages);
                                            });
                                        });
                                        $('.image-link').on('lightbox:open', function() {
                                            $(this).next('.image-title').hide();
                                        });

                                        $('.imgcheckbox').prop('checked', all);
                                        if (images.length > 0) {
                                            modal.getBody().find('.pagination-controls')
                                            .html(getPaginationControls(response.currentPage, response.totalPages));
                                        } else {
                                            modal.getBody().find('.pagination-controls').html('');
                                        }
                                    });
                            },
                            error: function(jqXHR, textStatus) {
                                modal.getBody().find('.image-content').html('<p>Error loading images: '
                                    + textStatus + '</p>');
                            }
                        });
                    }

                    /**
                     * Get css class
                     *
                     * @param {text} status status
                     * @return {string} status class
                     */
                    function getCssClass(status) {
                        switch (status.toLowerCase()) {
                            case 'main image':
                                return 'main-image';
                            case 'warning':
                                return 'warning-image';
                            default:
                                return 'green-image';
                        }
                    }

                    /**
                     * Get pagination controls
                     * @param {int} currentPage Current page number
                     * @param {int} totalPages Total number of pages
                     * @return {string} HTML for pagination controls
                     */
                    function getPaginationControls(currentPage, totalPages) {
                        var prevButton = '<button class="prev-page" ' +
                            (currentPage === 1 ? 'disabled' : '') + '>Previous</button>';
                        var nextButton = '<button class="next-page" ' +
                            (currentPage === totalPages ? 'disabled' : '') + '>Next</button>';

                        return '<div>' + prevButton + ' Page ' + currentPage
                            + ' of ' + totalPages + ' ' + nextButton + '</div>';
                    }

                    modal.getRoot().on('hidden.bs.modal', function() {
                        $('.imgcheckbox').prop('checked', false);
                    });

                    modal.getBody().on('change', '.imgcheckbox', function() {
                        all = $(this).is(':checked'); // Store boolean directly
                        modaltitle = all ? M.util.get_string('allimages', 'quizaccess_quizproctoring')
                                         : M.util.get_string('proctoringimages', 'quizaccess_quizproctoring');
                        modal.setTitle(modaltitle);
                        loadImages(currentPage);
                    });

                    modal.getBody().off('click', '.prev-page').on('click', '.prev-page', function() {
                        if (currentPage > 1) {
                            currentPage--;
                            loadImages(currentPage);
                        }
                    });

                    modal.getBody().off('click', '.next-page').on('click', '.next-page', function() {
                        if (currentPage < totalPages) {
                            currentPage++;
                            loadImages(currentPage);
                        }
                    });
                    loadImages(currentPage);

                    modal.getBody().on('click', '.close', function() {
                        $('.imgcheckbox').prop('checked', false);
                    });

                    let escapePressed = false;
                    $(document).on('keydown', function(event) {
                        if (event.key === "Escape" && !escapePressed) {
                            escapePressed = true;

                            if ($('.lb-container').css('display') === 'block') {
                                // eslint-disable-next-line no-undef
                                lightbox.end();
                            }
                            if (typeof modal !== 'undefined' && modal.isVisible()) {
                                modal.hide();
                            }
                            setTimeout(() => {
                                escapePressed = false;
                            }, 50);
                            event.stopPropagation();
                            $('.imgcheckbox').prop('checked', false); // Reset checkbox
                        }
                    });
                    return undefined;
                })
                .catch(function() {
                    // Console.log(err);
                });
            });

            $('#attemptsreporttable').on('click', '.proctoridentity', function(event) {
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

            $('#attemptsreporttable').on('click', '.generate', function(event) {
                event.preventDefault();

                const attemptid = $(this).data('attemptid');
                const quizid = $(this).data('quizid');
                const userid = $(this).data('userid');
                const username = encodeURIComponent($(this).data('username')); // URL-safe

                const url = `${M.cfg.wwwroot}/mod/quiz/accessrule/quizproctoring/userreport.php?attemptid=${attemptid}&quizid=${quizid}&userid=${userid}&username=${username}`;

                window.open(url, '_blank');
            });
        }
    };
});
