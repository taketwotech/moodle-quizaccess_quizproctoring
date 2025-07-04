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
 * AJAX call to save alert in real time and make it part of moodle file
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->libdir . '/completionlib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_login();
global $DB, $USER;
use mod_quiz\quiz_attempt;

$quizid = required_param('quizid', PARAM_INT);
$userid = required_param('userid', PARAM_INT);
$alertmessage = optional_param('alertmessage', '', PARAM_TEXT);
$attemptid = required_param('attemptid', PARAM_INT);
$quizsubmit = optional_param('quizsubmit', false, PARAM_BOOL);

$cm = get_coursemodule_from_instance('quiz', $quizid);
if (!$cm) {
    echo json_encode(['errorcode' => 1, 'success' => false, 'msg' => 'Invalid quiz ID']);
    die();
}
$context = context_module::instance($cm->id);

if ($quizsubmit) {
    $attemptobj = quiz_attempt::create($attemptid);
    $attemptobj->process_finish(time(), false);
    $autosubmitdata = $DB->get_record('quizaccess_proctor_data', [
        'userid' => $userid,
        'quizid' => $quizid,
        'attemptid' => $attemptid,
        'image_status' => 'M',
    ]);
    $autosubmitdata->isautosubmit = 1;
    $autosubmitdata->issubmitbyteacher = 1;
    $DB->update_record('quizaccess_proctor_data', $autosubmitdata);
    echo json_encode(['success' => 'true', 'redirect' => 'true',
        'msg' => get_string('autosubmitbyteacher', 'quizaccess_quizproctoring'), 'url' => $attemptobj->review_url()->out()]);
    die();
} else {
    $record = new stdClass();
    $record->userid = $userid;
    $record->quizid = $quizid;
    $record->attemptid = $attemptid;
    $record->alertmessage = $alertmessage;
    $record->timecreated = time();

    $DB->insert_record('quizaccess_proctor_alert', $record);

    $response = [
        'success' => true,
        'msg' => 'Alert sent successfully!',
    ];
    echo json_encode($response);
    exit();
}
