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
 * Teacher Proctoring access file.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_login();

$PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/room.php'));

$room = required_param('room', PARAM_INT);
$cmid = required_param('cmid', PARAM_INT);

$context = context_module::instance($cmid);
if (!has_capability('quizaccess/quizproctoring:quizproctoringonlinestudent', $context)) {
    redirect($CFG->wwwroot . "/mod/quiz/view.php?id={$cmid}");
}

$PAGE->set_title(get_string('viewstudentonline', 'quizaccess_quizproctoring'));
$PAGE->set_pagelayout('report');
echo $OUTPUT->header();
$serviceoption = get_config('quizaccess_quizproctoring', 'serviceoption');

// Include js module.
echo html_writer::script('', $CFG->wwwroot.'/mod/quiz/accessrule/quizproctoring/libraries/socket.io.js', true);
$PAGE->requires->js_call_amd('quizaccess_quizproctoring/add_camera',
'init', [$cmid, false, true, null, true, $room, $serviceoption]);

echo $OUTPUT->footer();
