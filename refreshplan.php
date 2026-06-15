<?php
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
 * Refresh ProctorLink plan details from the quiz settings page.
 *
 * @package    quizaccess_quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

require_login();
require_sesskey();

$courseid = required_param('courseid', PARAM_INT);
$returnurl = required_param('returnurl', PARAM_LOCALURL);

$context = context_course::instance($courseid);
require_capability('mod/quiz:addinstance', $context);

if (quizaccess_quizproctoring_sync_plan_from_api()) {
    redirect(
        new moodle_url($returnurl),
        get_string('plansyncsuccess', 'quizaccess_quizproctoring'),
        null,
        \core\output\notification::NOTIFY_SUCCESS
    );
}

redirect(
    new moodle_url($returnurl),
    get_string('plansyncfailed', 'quizaccess_quizproctoring'),
    null,
    \core\output\notification::NOTIFY_WARNING
);
