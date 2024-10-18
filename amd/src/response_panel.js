// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Javascript controller for the "Grading" panel at the right of the page
 *
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['jquery', 'core/modal_factory', 'core/modal_events', 'core/templates'],
function($, ModalFactory, ModalEvents, Templates) {
    var init = function(attemptid = null, quizid = null, userid = null, useridentity = null, proctoringimageshow) {
        var docElement = $(document);
        docElement.ready(function() {
            if (proctoringimageshow == 1) {
                let btn = document.createElement("button");
                btn.innerHTML = M.util.get_string('proctoringimages', 'quizaccess_quizproctoring');
                btn.setAttribute("type", "button");
                btn.setAttribute("value", "proctoringimage");
                btn.setAttribute("class", "proctoringimage btn btn-primary");
                btn.setAttribute("data-attemptid", attemptid);
                btn.setAttribute("data-quizid", quizid);
                btn.setAttribute("data-userid", userid);
                document.getElementById("page-content").prepend(btn);
            }
            if (useridentity && useridentity != 0) {
                let btnidentity = document.createElement("button");
                btnidentity.innerHTML = M.util.get_string('proctoringidentity', 'quizaccess_quizproctoring');
                btnidentity.setAttribute("type", "button");
                btnidentity.setAttribute("value", "proctoridentity");
                btnidentity.setAttribute("class", "proctoridentity btn btn-primary");
                btnidentity.setAttribute("data-attemptid", attemptid);
                btnidentity.setAttribute("data-quizid", quizid);
                btnidentity.setAttribute("data-userid", userid);
                document.getElementById("page-content").prepend(btnidentity);
            }
        });

        docElement.on('click', 'button.proctoringimage', function(e) {
            e.preventDefault();
            var quizid = $(this).data('quizid');
            var userid = $(this).data('userid');
            var attemptid = $(this).data('attemptid');
            $.ajax({
                url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_report.php',
                data: {
                    attemptid: attemptid,
                    userid: userid,
                    quizid: quizid
                },
                dataType: 'json',
                success: function(response) {
                    var images = JSON.parse(JSON.stringify(response));
                    if (images.length > 0) {
                        var data = {
                            images: images.map(function(image) {
                                return {
                                    url: image.img,
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
                            $('.image-link').on('click', function(event) {
                                var titleElement = $(this).next('.image-title');
                                titleElement.show();                            
                                setTimeout(function() {
                                    titleElement.hide();
                                }, 1000);
                                
                                lightbox.start($(this)[0]);
                            });
                            $('.image-link').on('lightbox:open', function() {
                                $(this).next('.image-title').hide();
                            });
                                   
                            });
                        })
                        .fail(function() {
                            console.error('Failed to render Mustache template');
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

        docElement.on('click', 'button.proctoridentity', function(e) {
            e.preventDefault();
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
    };
    return {
        init: init
    };
});
