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
                            // Do nothing on 'Cancel'.
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
                    // Error logging disabled.
                });
            });

            $('#proctoringreporttable').on('click', '.delete-aicon', function(event) {
                event.preventDefault();
                var username = $(this).data('username');
                var cmid = $(this).data('cmid');
                var quizid = $(this).data('quizid');
                var userid = $(this).data('userid');
                var newUrl = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/proctoringreport.php?deleteaudio='
                + userid + '&cmid=' + cmid + '&quizid=' + quizid;
                Promise.all([
                    str.get_string('deleteallaudiosuser', 'quizaccess_quizproctoring', username),
                    str.get_string('confirmation', 'quizaccess_quizproctoring'),
                    str.get_string('deleteallaudios', 'quizaccess_quizproctoring'),
                    str.get_string('delete', 'moodle'),
                    str.get_string('cancel', 'moodle'),
                ]).then(function(strings) {
                    var message = strings[0];
                    var title = strings[1];
                    var checkboxtext = strings[2];
                    var deleteLabel = strings[3];
                    var cancelLabel = strings[4];
                    var checkboxHtml = '<div><input type="checkbox" id="deleteallaudios" /><label class="deleteall">'
                    + checkboxtext + '</label></div>';
                    notification.confirm(
                        title,
                        message + checkboxHtml,
                        deleteLabel,
                        cancelLabel,
                        function() {
                            var allaudioss = $('#deleteallaudios').is(':checked');
                            if (allaudioss) {
                                newUrl += '&all=true';
                                window.location.href = newUrl;
                            }
                        },
                        function() {
                            // Do nothing on 'Cancel'.
                            return;
                        }
                    );
                    setTimeout(function() {
                        $('.modal-footer').addClass('deletenotifbtn');
                        var deleteButton = $('.modal-footer button[data-action="save"]');
                        deleteButton.prop('disabled', true);
                        $(document).off('change', '#deleteallaudios').on('change', '#deleteallaudios', function() {
                            deleteButton.prop('disabled', !$(this).is(':checked'));
                        });
                    }, 300);
                    return undefined;
                })
                .catch(function() {
                    // Error logging disabled.
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
                            // Do nothing on 'Cancel'.
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
                    // Error logging disabled.
                });
            });

            $('.delete-audio-quiz').on('click', function(event) {
                event.preventDefault();
                var quizname = $(this).data('quiz');
                var cmid = $(this).data('cmid');
                var quizid = $(this).data('quizid');
                var newUrl = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/imagesreport.php?cmid='
                + cmid + '&deleteaudioquiz=' + quizid;
                Promise.all([
                    str.get_string('deleteallaudiosquiz', 'quizaccess_quizproctoring', quizname),
                    str.get_string('confirmation', 'quizaccess_quizproctoring'),
                    str.get_string('deleteallaudios', 'quizaccess_quizproctoring'),
                    str.get_string('delete', 'moodle'),
                    str.get_string('cancel', 'moodle'),
                ]).then(function(strings) {
                    var message = strings[0];
                    var title = strings[1];
                    var checkboxtext = strings[2];
                    var deleteLabel = strings[3];
                    var cancelLabel = strings[4];
                    var checkboxHtml = '<div><input type="checkbox" id="deleteallaudio" /><label class="deleteall">'
                    + checkboxtext + '</label></div>';
                    notification.confirm(
                        title,
                        message + checkboxHtml,
                        deleteLabel,
                        cancelLabel,
                        function() {
                            var allAudios = $('#deleteallaudio').is(':checked');
                            if (allAudios) {
                                newUrl += '&all=true';
                                window.location.href = newUrl;
                            }
                        },
                        function() {
                            // Do nothing on 'Cancel'.
                            return;
                        }
                    );
                    setTimeout(function() {
                        $('.modal-footer').addClass('deletenotifbtn');
                        var deleteButton = $('.modal-footer button[data-action="save"]');
                        deleteButton.prop('disabled', true);
                        $(document).off('change', '#deleteallaudio').on('change', '#deleteallaudio', function() {
                            deleteButton.prop('disabled', !$(this).is(':checked'));
                        });
                    }, 300);
                    return undefined;
                })
                .catch(function() {
                    // Error logging disabled.
                });
            });

            $('.delcourseaudio').on('click', function(event) {
                event.preventDefault();
                var coursename = $(this).data('course');
                var cmid = $(this).data('cmid');
                var courseid = $(this).data('courseid');
                var newUrl = M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/imagesreport.php?cmid='
                + cmid + '&deleteaudiocourse=' + courseid;
                Promise.all([
                    str.get_string('deleteallaudioscourse', 'quizaccess_quizproctoring', coursename),
                    str.get_string('confirmation', 'quizaccess_quizproctoring'),
                    str.get_string('deleteallaudios', 'quizaccess_quizproctoring'),
                    str.get_string('delete', 'moodle'),
                    str.get_string('cancel', 'moodle'),
                ]).then(function(strings) {
                    var message = strings[0];
                    var title = strings[1];
                    var checkboxtext = strings[2];
                    var deleteLabel = strings[3];
                    var cancelLabel = strings[4];
                    var checkboxHtml = '<div><input type="checkbox" id="deleteallaudioc" /><label class="deleteall">'
                    + checkboxtext + '</label></div>';
                    notification.confirm(
                        title,
                        message + checkboxHtml,
                        deleteLabel,
                        cancelLabel,
                        function() {
                            var allAudios = $('#deleteallaudioc').is(':checked');
                            if (allAudios) {
                                newUrl += '&all=true';
                                window.location.href = newUrl;
                            }
                        },
                        function() {
                            // Do nothing on 'Cancel'.
                            return;
                        }
                    );
                    setTimeout(function() {
                        $('.modal-footer').addClass('deletenotifbtn');
                        var deleteButton = $('.modal-footer button[data-action="save"]');
                        deleteButton.prop('disabled', true);
                        $(document).off('change', '#deleteallaudioc').on('change', '#deleteallaudioc', function() {
                            deleteButton.prop('disabled', !$(this).is(':checked'));
                        });
                    }, 300);
                    return undefined;
                })
                .catch(function() {
                    // Error logging disabled.
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
                            // Do nothing on 'Cancel'.
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
                    // Error logging disabled.
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
                var storeAllImages = $('#storeallimages').val();

                var checkboxLabel;
                str.get_string('viewallimages_checkbox', 'quizaccess_quizproctoring').then(function(label) {
                    checkboxLabel = label;
                    return ModalFactory.create({
                        type: ModalFactory.types.DEFAULT,
                        body: '<div class="image-content"><p>Loading images...</p></div><div class="pagination-controls"></div>',
                        title: modaltitle,
                        large: true,
                    });
                }).then(function(modal) {
                    modal.show();
                    $('.imgcheckbox').prop('checked', false);
                    var checkboxContainer = `
                        <div class="checkbox-container" style="display: none;">
                            <input type="checkbox" class="imgcheckbox">
                            <label for="checkbox" class="image-checkbox">
                                ${checkboxLabel}
                            </label>
                        </div>
                    `;
                    modal.getBody().prepend(checkboxContainer);
                    return modal;
                }).then(function(modal) {
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
                        all = $(this).is(':checked'); // Store boolean directly.
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
                            $('.imgcheckbox').prop('checked', false); // Reset checkbox.
                        }
                    });
                    return undefined;
                }).catch(function() {
                    // Error logging disabled.
                });
            });

            $('#attemptsreporttable').on('click', '.proctoringaudio', function(event) {
                event.preventDefault();

                var attemptid = $(this).data('attemptid');
                var startdate = $(this).data('startdate');
                var modaltitle = M.util.get_string('proctoringaudio', 'quizaccess_quizproctoring');

                ModalFactory.create({
                    type: ModalFactory.types.DEFAULT,
                    body: '<div class="audio-content"><p>Loading audios...</p></div><div class="pagination-controls"></div>',
                    title: modaltitle,
                    large: true,
                }).then(function(modal) {
                    modal.show();

                    var perpage = 20;
                    var currentPage = 1;
                    var totalPages = 1;

                    /**
                     * Stops all audio playback in the modal by pausing and resetting all audio elements.
                     */
                    function stopAllAudioInModal() {
                        modal.getRoot().find('audio').each(function() {
                            this.pause();
                            this.currentTime = 0;
                        });
                    }

                    modal.getRoot().on(ModalEvents.hidden, function() {
                        stopAllAudioInModal();
                        $(document).off('keydown.stopAllAudioOnEsc');
                    });

                    $(document).on('keydown.stopAllAudioOnEsc', function(e) {
                        if (e.key === 'Escape') {
                            stopAllAudioInModal();
                        }
                    });

                    modal.getRoot().on('click', '.prev-page, .next-page', function() {
                        stopAllAudioInModal();
                    });

                    /**
                     * Loads audio files for a specific page via AJAX and renders them in the modal.
                     * @param {number} page - The page number to load.
                     */
                    function loadAudios(page) {
                        $.ajax({
                            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/audio_report.php',
                            data: {
                                attemptid: attemptid,
                                page: page,
                                perpage: perpage,
                            },
                            dataType: 'json',
                            success: function(response) {
                                if (!response || !Array.isArray(response.audios)) {
                                    modal.getBody().find('.audio-content').html('<p>Error: Invalid audio.</p>');
                                    modal.getBody().find('.pagination-controls').html('');
                                    return;
                                }

                                totalPages = response.totalPages;

                                var audios = response.audios.map(function(audio) {
                                    return {
                                        url: audio.audiofile,
                                        time: audio.timecreated
                                    };
                                });

                                var data = {
                                    attemptdate: startdate,
                                    audios: audios,
                                    currentPage: response.currentPage,
                                    totalPages: response.totalPages,
                                    isFirstPage: response.currentPage === 1,
                                    isLastPage: response.currentPage === response.totalPages,
                                    str: function(key) {
                                        return M.util.get_string(key, 'quizaccess_quizproctoring');
                                    }
                                };

                                modal.getBody().find('.audio-content').html('');
                                Templates.render('quizaccess_quizproctoring/response_audio_modal', data)
                                    .done(function(renderedHtml) {
                                        modal.getBody().find('.audio-content').html(renderedHtml);

                                        $('audio').on('play', function() {
                                            $('audio').not(this).each(function() {
                                                this.pause();
                                                this.currentTime = 0;
                                            });
                                        });

                                        if (audios.length > 0) {
                                            modal.getBody().find('.pagination-controls')
                                                .html(getPaginationControls(response.currentPage, response.totalPages));
                                        } else {
                                            modal.getBody().find('.pagination-controls').html('');
                                        }
                                    });
                            },
                            error: function(jqXHR, textStatus) {
                                modal.getBody().find('.audio-content').html('<p>Error loading audios: ' + textStatus + '</p>');
                            }
                        });
                    }

                    /**
                     * Generates HTML for pagination controls (Previous/Next buttons).
                     * @param {number} currentPage - The current page number.
                     * @param {number} totalPages - The total number of pages.
                     * @returns {string} HTML string containing pagination controls.
                     */
                    function getPaginationControls(currentPage, totalPages) {
                        var prevButton = '<button class="prev-page" ' +
                            (currentPage === 1 ? 'disabled' : '') + '>Previous</button>';
                        var nextButton = '<button class="next-page" ' +
                            (currentPage === totalPages ? 'disabled' : '') + '>Next</button>';

                        return '<div>' + prevButton + ' Page ' + currentPage + ' of ' + totalPages + ' ' + nextButton + '</div>';
                    }

                    modal.getBody().off('click', '.prev-page').on('click', '.prev-page', function() {
                        if (currentPage > 1) {
                            currentPage--;
                            loadAudios(currentPage);
                        }
                    });

                    modal.getBody().off('click', '.next-page').on('click', '.next-page', function() {
                        if (currentPage < totalPages) {
                            currentPage++;
                            loadAudios(currentPage);
                        }
                    });

                    loadAudios(currentPage);
                    return modal;
                }).catch(function() {
                    // Error logging disabled.
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
                            }).catch(function() {
                                // Error logging disabled.
                            });
                        }
                        return true;
                    }
                });
            });

            // Handle click on device info icon to display device name in modal
            $(document).on('click', '.device-info-icon', function(event) {
                event.preventDefault();
                event.stopPropagation();
                var deviceinfo = $(this).data('deviceinfo');
                if (deviceinfo) {
                    // Escape device info to prevent XSS
                    var escapedDeviceInfo = $('<div>').text(deviceinfo).html();
                    return ModalFactory.create({
                        type: ModalFactory.types.DEFAULT,
                        body: '<div class="device-info-content"><p>' + escapedDeviceInfo + '</p></div>',
                        title: 'Device Information',
                    }).then(function(modal) {
                        modal.getRoot().on(ModalEvents.hidden, modal.destroy.bind(modal));
                        modal.show();
                        return null;
                    }).catch(function() {
                        // Error logging disabled.
                    });
                }
                return undefined;
            });

            $('#attemptsreporttable').on('click', '.generate', function(event) {
                event.preventDefault();

                const attemptid = $(this).data('attemptid');
                const quizid = $(this).data('quizid');
                const userid = $(this).data('userid');
                const username = encodeURIComponent($(this).data('username')); // URL-safe.

                const url = `${M.cfg.wwwroot}/mod/quiz/accessrule/quizproctoring/userreport.php` +
                `?attemptid=${attemptid}` +
                `&quizid=${quizid}` +
                `&userid=${userid}` +
                `&username=${username}`;

                window.open(url, '_blank');
            });

            // Handle alerts modal.
            $(document).on('click', '.alert-icon', function(event) {
                event.preventDefault();
                event.stopPropagation();

                var $icon = $(this);
                var alertsDataJson = $icon.attr('data-alerts');

                if (!alertsDataJson) {
                    return;
                }

                var alertsData;
                try {
                    alertsData = JSON.parse(alertsDataJson);
                } catch (e) {
                    // Show error notification without blocking.
                    str.get_string('error', 'moodle').catch(function() {
                        return 'Error parsing alerts data';
                    }).then(function(errorMsg) {
                        notification.addNotification({
                            message: errorMsg,
                            type: 'error'
                        });
                        return undefined;
                    }).catch(function() {
                        // Error logging disabled.
                    });
                    return;
                }

                Promise.all([
                    str.get_string('alerts', 'quizaccess_quizproctoring'),
                    str.get_string('close', 'moodle')
                ]).then(function(strings) {
                    var alertTitle = strings[0];
                    var closeLabel = strings[1];

                    /**
                     * Escape HTML to prevent XSS attacks.
                     *
                     * @param {string} text Text to escape
                     * @return {string} Escaped text
                     */
                    function escapeHtml(text) {
                        if (!text) {
                            return '';
                        }
                        return String(text)
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#039;');
                    }

                    /**
                     * Build alert row HTML.
                     *
                     * @param {Object} alert Alert object with message, time, and teacher
                     * @return {string} HTML string for alert row
                     */
                    function buildAlertRow(alert) {
                        var message = escapeHtml(alert.message || '');
                        var time = escapeHtml(alert.time || '');
                        var teacher = escapeHtml(alert.teacher || '');

                        var teacherHtml = '';
                        if (teacher) {
                            teacherHtml = '<div class="alert-teacher">' +
                                '<strong>Teacher:</strong> ' + teacher +
                                '</div>';
                        }

                        return '<div class="alert-row">' +
                            teacherHtml +
                            '<div class="alert-content">' +
                            '<div class="alert-message">' + message + '</div>' +
                            '<div class="alert-time">' + time + '</div>' +
                            '</div>' +
                            '</div>';
                    }

                    /**
                     * Build modal HTML.
                     *
                     * @param {string} title Modal title
                     * @param {Array} alerts Array of alert objects
                     * @return {string} Complete modal HTML
                     */
                    function buildModalHtml(title, alerts) {
                        var bodyContent = '';
                        if (alerts && alerts.length > 0) {
                            alerts.forEach(function(alert) {
                                bodyContent += buildAlertRow(alert);
                            });
                        } else {
                            bodyContent = '<p class="no-alerts">No alerts found</p>';
                        }

                        return '<div id="alertsModal" class="alerts-modal">' +
                            '<div class="alerts-modal-content">' +
                            '<div class="alerts-modal-header">' +
                            '<h4 class="alerts-modal-title">' + escapeHtml(title) + '</h4>' +
                            '<button type="button" class="alerts-close" aria-label="' + escapeHtml(closeLabel) + '">' +
                            '<span aria-hidden="true">&times;</span>' +
                            '</button>' +
                            '</div>' +
                            '<div class="alerts-modal-body">' + bodyContent + '</div>' +
                            '</div>' +
                            '</div>';
                    }

                    /**
                     * Close alerts modal and clean up event listeners.
                     */
                    function closeAlertsModal() {
                        var modalElement = $('#alertsModal');
                        if (modalElement.length > 0) {
                            modalElement.removeClass('show');
                            setTimeout(function() {
                                modalElement.remove();
                                $(document).off('keydown.alertsModal');
                            }, 300);
                        }
                    }

                    // Remove existing modal if any.
                    var existingModal = $('#alertsModal');
                    if (existingModal.length > 0) {
                        existingModal.remove();
                        $(document).off('keydown.alertsModal');
                    }

                    // Build and add modal to body.
                    var modalHtml = buildModalHtml(alertTitle, alertsData);
                    $('body').append(modalHtml);

                    // Show modal with animation.
                    var modal = $('#alertsModal');
                    setTimeout(function() {
                        modal.addClass('show');
                    }, 10);

                    // Close handlers.
                    modal.on('click', '.alerts-close', function() {
                        closeAlertsModal();
                    });

                    // Close on backdrop click.
                    modal.on('click', function(e) {
                        if ($(e.target).is('#alertsModal')) {
                            closeAlertsModal();
                        }
                    });

                    // Close on Escape key.
                    $(document).on('keydown.alertsModal', function(e) {
                        if (e.key === 'Escape' && modal.is(':visible')) {
                            closeAlertsModal();
                        }
                    });

                    return undefined;
                }).catch(function() {
                    // Handle error by showing notification.
                    return str.get_string('error', 'moodle').then(function(errorMsg) {
                        notification.addNotification({
                            message: errorMsg,
                            type: 'error'
                        });
                        return undefined;
                    }).catch(function() {
                        notification.addNotification({
                            message: 'Error loading alerts',
                            type: 'error'
                        });
                        return undefined;
                    });
                });
            });

            $('#attemptsreporttable').on('click', '.eyetoggle', function(event) {
                event.preventDefault();
                event.stopPropagation();

                const $checkbox = $(this).find('input[type="checkbox"]');
                const currentState = $checkbox.is(':checked');

                const $toggle = $(this);
                const cmid = $toggle.data('cmid');
                const attemptid = $toggle.data('attemptid');
                const userid = $toggle.data('userid');
                const useremail = $toggle.data('useremail');
                const action = $toggle.data('action');

                setTimeout(function() {
                    $checkbox.prop('checked', currentState);
                }, 0);

                /**
                 * Show error notification for eye toggle operation
                 * @return {Promise} Promise that resolves when notification is shown
                 */
                function showEyeToggleError() {
                    return str.get_string('eyeofferror', 'quizaccess_quizproctoring')
                        .then(function(text) {
                            notification.addNotification({
                                message: text,
                                type: 'error'
                            });
                            return undefined;
                        })
                        .catch(function() {
                            notification.addNotification({
                                message: 'Error occurred',
                                type: 'error'
                            });
                            return undefined;
                        });
                }

                /**
                 * Handle the AJAX toggle action
                 * @param {string} setGlobalValue The value for setglobal parameter
                 */
                function handleToggleAction(setGlobalValue) {
                    $.ajax({
                        url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_eyetoggle.php',
                        method: 'POST',
                        data: {
                            cmid: cmid,
                            attemptid: attemptid,
                            userid: userid,
                            action: action,
                            setglobal: setGlobalValue
                        },
                        dataType: 'json',
                        success: function(response) {
                            if (response.success) {
                                if (typeof window.attemptsReportTable !== 'undefined' &&
                                    window.attemptsReportTable &&
                                    typeof window.attemptsReportTable.ajax !== 'undefined' &&
                                    typeof window.attemptsReportTable.ajax.reload === 'function') {
                                    window.attemptsReportTable.ajax.reload(null, false);
                                } else {
                                    window.location.reload();
                                }
                            }
                        },
                        error: showEyeToggleError
                    });
                }

                /**
                 * Show confirmation dialog with checkbox
                 * @param {boolean} checkboxChecked Whether checkbox should be checked
                 */
                function showConfirmationDialog(checkboxChecked) {
                    const messageKey = action === 'disable' ? 'disableeyetrackingmessage' : 'enableeyetrackingmessage';
                    Promise.all([
                        str.get_string(messageKey, 'quizaccess_quizproctoring', useremail),
                        str.get_string('disableeyetrackingallquizzes', 'quizaccess_quizproctoring'),
                        str.get_string('yes', 'moodle'),
                        str.get_string('cancel', 'moodle')
                    ]).then(function(strings) {
                        const message = strings[0];
                        const checkboxText = strings[1];
                        const confirmLabel = strings[2];
                        const cancelLabel = strings[3];

                        const checkboxHtml = `
                            <div style="margin-top: 15px;">
                                <input type="checkbox" id="eyetrackingglobal" ${checkboxChecked ?
                                    'checked' : ''} />
                                <label for="eyetrackingglobal" style="margin-left: 5px;">
                                    ${checkboxText}
                                </label>
                            </div>
                        `;

                        notification.confirm(
                            '',
                            message + checkboxHtml,
                            confirmLabel,
                            cancelLabel,
                            function() {
                                const setGlobal = $('#eyetrackingglobal').is(':checked') ? 1 : 0;
                                handleToggleAction(setGlobal);
                            },
                            function() {
                                return;
                            }
                        );
                        return undefined;
                    }).catch(function() {
                        notification.addNotification({
                            message: 'Error loading confirmation dialog',
                            type: 'error'
                        });
                        return undefined;
                    });
                }

                // Get global preference to determine if checkbox should be checked.
                $.ajax({
                    url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_eyetoggle.php',
                    method: 'POST',
                    data: {
                        cmid: cmid,
                        attemptid: attemptid,
                        userid: userid,
                        action: 'getpreference'
                    },
                    dataType: 'json',
                    success: function(prefResponse) {
                        const hasGlobalPref = (prefResponse.globalpreference !== null &&
                                             prefResponse.globalpreference !== undefined);
                        const checkboxChecked = hasGlobalPref;
                        showConfirmationDialog(checkboxChecked);
                    },
                    error: function() {
                        showConfirmationDialog(false);
                    }
                });
            });
        }
    };
});
