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
$studenthexstring = get_config('quizaccess_quizproctoring', 'quizproctoringhexstring');
$roomid = $studenthexstring.'_'.$room;
$cmid = required_param('cmid', PARAM_INT);
$proctorrecord = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $room]);
if ($proctorrecord->enableteacherproctor) {
    $context = context_module::instance($cmid);
    if (!has_capability('quizaccess/quizproctoring:quizproctoringonlinestudent', $context)) {
        redirect($CFG->wwwroot . "/mod/quiz/view.php?id={$cmid}");
    }
    $PAGE->set_title(get_string('viewstudentonline', 'quizaccess_quizproctoring'));
    $PAGE->set_pagelayout('embedded');
    echo $OUTPUT->header();
    
    // Add CSS to ensure full page coverage
    echo '<style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            height: 100vh;
            width: 100vw;
        }
        #page {
            margin: 0;
            padding: 0;
            height: 100vh;
            width: 100vw;
        }
        #page-content {
            margin: 0;
            padding: 0;
            height: 100vh;
            width: 100vw;
        }
        .teacher-iframe-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 0;
            z-index: 9999;
        }
        .teacher-iframe-container iframe {
            width: 100%;
            height: 100%;
            border: none;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }
    </style>';
    
    // Add teacher iframe that uses full page
    $teacherUrl = get_config('quizaccess_quizproctoring', 'teacher_url') ?: 'https://stream.proctorlink.com/teacher';
    $teacherParams = [
        'room' => $roomid,
        'cmid' => $cmid,
        'teacher' => 'true'
    ];
    $teacherIframeUrl = $teacherUrl . '?' . http_build_query($teacherParams);
    
    echo '<div class="teacher-iframe-container">';
    echo '<iframe src="' . htmlspecialchars($teacherIframeUrl) . '"></iframe>';
    echo '</div>';
    
    echo $OUTPUT->footer();
} else {
    redirect($CFG->wwwroot . "/mod/quiz/view.php?id={$cmid}");
}
