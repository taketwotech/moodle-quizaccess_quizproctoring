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
 * AJAX endpoint to schedule warning-threshold emails as an adhoc task.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2026
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

require_login();

$cmid = required_param('cmid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$warningemailcount = required_param('warningemailcount', PARAM_INT);

if (!$cm = get_coursemodule_from_id('quiz', $cmid, 0, false, MUST_EXIST)) {
    throw new moodle_exception('invalidcoursemodule');
}

$course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$context = context_module::instance($cm->id);
$PAGE->set_context($context);

// Only proceed when the configured warnings threshold is "unlimited".
$settings = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $quizid]);
if (
    !$settings ||
    (int) $settings->warning_threshold !== 0 ||
    empty($settings->warning_email_threshold)
) {
    echo json_encode(['status' => 'ignored']);
    die();
}

// Queue the email task only when the current warning count matches the
// configured email threshold. No server-side recount of warnings.
if ((int)$warningemailcount === (int)$settings->warning_email_threshold) {
    quizaccess_quizproctoring_schedule_warning_email(
        $course->id,
        $cmid,
        $quizid,
        $USER->id,
        $attemptid,
        $warningemailcount
    );
    echo json_encode(['status' => 'queued']);
    die();
}

echo json_encode(['status' => 'noaction']);
die();
