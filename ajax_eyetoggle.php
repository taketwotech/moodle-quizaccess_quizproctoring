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
 * AJAX endpoint to toggle eye detection preference
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../../config.php');
require_login();

global $DB, $USER;

$cmid = required_param('cmid', PARAM_INT);
$attemptid = required_param('attemptid', PARAM_INT);
$targetuserid = required_param('userid', PARAM_INT);
$action = required_param('action', PARAM_TEXT); // 'enable' or 'disable'
$setglobal = optional_param('setglobal', 0, PARAM_INT); // 1 if checkbox is checked

$context = context_module::instance($cmid);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

if ($action === 'getpreference') {
    $globalpref = get_user_preferences('eye_detection_global', null, $targetuserid);
    echo json_encode([
        'success' => true,
        'globalpreference' => $globalpref
    ]);
    exit;
}

$attempt = $DB->get_record('quiz_attempts', ['id' => $attemptid], '*', MUST_EXIST);
if ($attempt->userid != $targetuserid) {
    echo json_encode(['success' => false, 'error' => 'Invalid attempt']);
    exit;
}

$proctorrecord = $DB->get_record('quizaccess_main_proctor', [
    'attemptid' => $attemptid,
    'userid' => $targetuserid
], '*', MUST_EXIST);

$newstate = ($action === 'enable') ? 1 : 0;

$proctorrecord->iseyecheck = $newstate;
$proctorrecord->iseyedisabledbyteacher = ($action === 'disable') ? 1 : 0;
$DB->update_record('quizaccess_main_proctor', $proctorrecord);

set_user_preference('eye_detection', $newstate, $targetuserid);

if ($setglobal == 1) {
    set_user_preference('eye_detection_global', 0, $targetuserid);
} else {
    unset_user_preference('eye_detection_global', $targetuserid);
}

echo json_encode([
    'success' => true,
    'iseyecheck' => $newstate,
    'action' => $action
]);
exit;

