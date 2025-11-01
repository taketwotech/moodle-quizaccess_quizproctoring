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

$PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/room.php'));
$room = required_param('room', PARAM_INT);
$studenthexstring = get_config('quizaccess_quizproctoring', 'quizproctoringhexstring');
$cmid = required_param('cmid', PARAM_INT);
$context = context_module::instance($cmid, MUST_EXIST);

if (class_exists('\mod_quiz\quiz_settings')) {
    if ($room) {
        $quizobj = \mod_quiz\quiz_settings::create($room, $USER->id);
    } else {
        $quizobj = \mod_quiz\quiz_settings::create_for_cmid($cmid, $USER->id);
    }
    $cm = $quizobj->get_cm();
    $course = $quizobj->get_course();
} else {
    $cm = get_coursemodule_from_id('quiz', $cmid, 0, false, MUST_EXIST);
    $course = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
}
require_login($course, true, $cm);
$proctorrecord = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $room]);
if ($proctorrecord->enableteacherproctor) {
    if (!has_capability('quizaccess/quizproctoring:quizproctoringonlinestudent', $context)) {
        redirect($CFG->wwwroot . "/mod/quiz/view.php?id={$cmid}");
    }
    $PAGE->set_title(get_string('viewstudentonline', 'quizaccess_quizproctoring'));
    $PAGE->set_pagelayout('report');
    $PAGE->add_body_class('drawer-closed');
    echo $OUTPUT->header();

    $proctoringgrouping = $DB->get_record('groupings', ['name' => 'proctoring', 'courseid' => $course->id]);
    $usergroup = '';

    if ($proctoringgrouping) {
        $sql = "SELECT g.name
                FROM {groups} g
                JOIN {groupings_groups} gg ON g.id = gg.groupid
                JOIN {groups_members} gm ON g.id = gm.groupid
                WHERE gg.groupingid = :groupingid
                AND gm.userid = :userid";
        $usergroup = $DB->get_field_sql($sql, ['groupingid' => $proctoringgrouping->id, 'userid' => $USER->id]);
    }
    $PAGE->requires->js(new moodle_url('/mod/quiz/accessrule/quizproctoring/libraries/js/validatelang.js'));
    $teacherurl = get_config('quizaccess_quizproctoring', 'teacher_url') ?: 'https://stream.proctorlink.com/teacher';
    $roomid = $studenthexstring . '_' . $room;
    if ($usergroup != '') {
        $roomid = $studenthexstring . '_' . $room . '_' . $usergroup;
    }
    $teacherparams = [
        'room' => $roomid,
        'cmid' => $cmid,
        'disablecontrol' => 1,
        'teacher' => 'true',
    ];

    $teacheriframeurl = $teacherurl . '?' . http_build_query($teacherparams, '', '&', PHP_QUERY_RFC3986);

    echo '<div class="teacher-iframe-container">';
    echo '<iframe src="' . htmlspecialchars($teacheriframeurl) . '"></iframe>';
    echo '</div>';

    echo $OUTPUT->footer();
} else {
    redirect($CFG->wwwroot . "/mod/quiz/view.php?id={$cmid}");
}
