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

import $ from 'jquery';
import Modal from 'core/modal';
import ModalFactory from 'core/modal_factory';
import ModalEvents from 'core/modal_events';
//import ModalProctoring from './modal_proctoring';

    var ResponsePanel = function(responses) {
        this.responses = responses;
        this.registerEventListeners();
    };

    ResponsePanel.prototype.qid = null;
    ResponsePanel.prototype.rid = null;
    ResponsePanel.prototype.sec = null;
    ResponsePanel.prototype.courseid = null;
    ResponsePanel.prototype.responses = Array();
    ResponsePanel.prototype.index = 0;
    ResponsePanel.prototype.quizid = 0;
    ResponsePanel.prototype.attemptid = 0;
    ResponsePanel.prototype.userid = 0;
    ResponsePanel.prototype.currentpage = 1;
    ResponsePanel.prototype.firstPage = 1;
    ResponsePanel.prototype.lastPage = 0;
    ResponsePanel.prototype.tempindex = 0;
    ResponsePanel.prototype.prevpage = 0;
    ResponsePanel.prototype.temarrayprev = Array();
    ResponsePanel.prototype.temarraynext = Array();
    /**
     * Register event listeners for the grade panel.
     *
     * @method registerEventListeners
     */
    ResponsePanel.prototype.registerEventListeners = function() {
       
        var self = this; // Store reference to ResponsePanel instance

    // Example assuming you have direct access to the buttons triggering 'next' and 'prev'
    $(document).on('click', SELECTORS.PREVIOUS_BUTTON, function(e) {
        $(document).trigger('prev');
        e.preventDefault();
    });

    $(document).on('click', SELECTORS.NEXT_BUTTON, function(e) {
        $(document).trigger('next');
        e.preventDefault();
    });

    // Assuming you also want to handle 'next' and 'prev' events within ResponsePanel
    $(document).on('next', function() {
        self._getNextUser();
    });

    $(document).on('prev', function() {
        self._getPreviousUser();
    });
};

    var registered = false;
        var SELECTORS = {
            PREVIOUS_BUTTON: '[data-action="previous"]',
            NEXT_BUTTON: '[data-action="next"]',
        };

    var ModalProctoring = function(root) {
        Modal.call(this, root);
        if (!this.getFooter().find(SELECTORS.PREVIOUS_BUTTON).length) {
                 Notification.exception({message: 'No previous button found'});
            }

            if (!this.getFooter().find(SELECTORS.NEXT_BUTTON).length) {
                Notification.exception({message: 'No next button found'});
            }
    };

    /**
     * Reset buttons method
     */
    ResponsePanel.prototype._reset = function() {
        if (this.responses.length) {
            var isFirst = this.index === 0;
            var isLast = this.responses.length === this.index + 1;
            if (isFirst) {
                if (this.firstPage == this.currentpage) {
                    $('[data-action="previous"]').prop("disabled", "disabled");
                } else {
                    $('[data-action="previous"]').prop("disabled", false);
                }
                $('[data-action="next"]').prop("disabled", false);
            } else if (isLast) {
                if (this.currentpage == this.lastpage) {
                    $('[data-action="next"]').prop("disabled", "disabled");
                } else {
                    $('[data-action="next"]').prop("disabled", false);
                }
                $('[data-action="previous"]').prop("disabled", false);
            } else {
                $('[data-action="previous"]').prop("disabled", false);
                $('[data-action="next"]').prop("disabled", false);
            }
        }
    };

    /**
     * First page settings
     *
     */
     ResponsePanel.prototype._isFirstPage = function() {
        var insidethid = this;
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_report.php',
            data: {
                attemptid: this.attemptid,
                userid: this.userid,
                quizid: this.quizid,
                currentpage: (this.currentpage - 2)
            },
            dataType: 'json',
            success: function(response) {
                var images = JSON.parse(JSON.stringify(response));
                insidethid.temarrayprev = images;
                insidethid.prevpage = 1;
            }
        });
     };

     /**
      * Last page settings
      *
      */
    ResponsePanel.prototype._isLastPage = function() {
        var insidethid = this;
        $.ajax({
            url: M.cfg.wwwroot + '/mod/quiz/accessrule/quizproctoring/ajax_report.php',
            data: {
                attemptid: this.attemptid,
                userid: this.userid,
                quizid: this.quizid,
                currentpage: this.currentpage
            },
            dataType: 'json',
            success: function(response) {
                var images = JSON.parse(JSON.stringify(response));
                insidethid.temarraynext = images;
                if (images[0]) {
                    insidethid.tempindex = 1;
                }
            }
        });
    };

    /**
     * Get next user to process
     *
     * @method _getNextUser
     */
    ResponsePanel.prototype._getNextUser = function() {
        if (this.tempindex) {
            this.index = -1;
            this.responses = this.temarraynext;
            this.currentpage += 1;
        }
        this.tempindex = 0;
        this.prevpage = 0;
        this.index += 1;
        this._reset();
        var res = this.responses[this.index];
        if (res) {
            $(".imgheading").html(res.title);
            $(".userimg").attr("src", res.img);
        }
        var isFirst = this.index === 0;
        if (isFirst) {
            this._isFirstPage();
        }
        var isLast = this.responses.length === this.index + 1;
        if (isLast) {
            this._isLastPage();
        }

    };

    /**
     * Get previous user to process
     *
     * @method _getNextUser
     */
    ResponsePanel.prototype._getPreviousUser = function() {
        if (this.tempindex) {
            this.index = 18;
        } else {
            this.index -= 1;
        }

        if (this.prevpage) {
            this.index = 19;
            this.responses = this.temarrayprev;
            this.currentpage -= 1;
        }
        this.prevpage = 0;
        this.tempindex = 0;
        this._reset();
        var res = this.responses[this.index];
        if (res) {
            $(".imgheading").html(res.title);
            $(".userimg").attr("src", res.img);
        }
        var isFirst = this.index === 0;
        if (isFirst) {
            this._isFirstPage();
        }

        var isLast = this.responses.length === this.index + 1;
        if (isLast) {
            this._isLastPage();
        }

    };

export default class ModalAddProctoringImage extends Modal {
    static TYPE = 'quizaccess_quizproctoring-response';
    static TEMPLATE = 'quizaccess_quizproctoring/response_modal';


    /**
     * Create the add random question modal.
     *
     * @param  {Number} attemptid Current attempt id.
     * @param  {Number} quizid quiz id.
     * @param  {Number} userid User Id.
     * @param  {boolean} useridentity user Identity.
     * @param  {boolean} proctoringimageshow proctoring Image Show.
     */
    static init(attemptid = null, quizid = null, userid = null, useridentity = null, $proctoringimageshow) {
        var docElement = $(document);
        docElement.ready(function() {
            if ($proctoringimageshow == 1) {
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
                    attemptid: $(this).data('attemptid'),
                    userid: $(this).data('userid'),
                    quizid: $(this).data('quizid')
                },
                dataType: 'json',
                success: function(response) {
                    console.log(response);
                    var images = JSON.parse(JSON.stringify(response));
                    if (images.length > 0) {
                        var rp = new ResponsePanel(images);
                        rp.quizid = quizid;
                        rp.userid = userid;
                        rp.attemptid = attemptid;
                        rp.lastpage = rp.responses[rp.index].totalpage;console.log(rp.responses[rp.index]);
                        return ModalAddProctoringImage.create({
                            type: ModalAddProctoringImage.TYPE,
                        }).then(function(modal) {
                            modal.getRoot().on(ModalEvents.hidden, modal.destroy.bind(modal));
                            modal.setTitle('User Images');
                            modal.show();
                            $(".imgheading").html(rp.responses[rp.index].title);
                            $(".userimg").attr("src", rp.responses[rp.index].img);
                            if (rp.responses[rp.index].total == 1) {
                                $('[data-action="next"]').prop("disabled", "disabled");
                            }
                            return null;
                        });
                    } else {
                        var message = M.util.get_string('noimageswarning', 'quizaccess_quizproctoring');
                        return ModalFactory.create({
                            type: ModalFactory.types.DEFAULT,
                            body: message,
                        }).then(function(modal) {
                            modal.getRoot().on(ModalEvents.hidden, modal.destroy.bind(modal));
                            modal.show();
                            return null;
                        });
                    }
                }
            });
        });
    }
}

ModalAddProctoringImage.registerModalType();
