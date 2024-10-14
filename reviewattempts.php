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
 * Show attempts image report
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use mod_quiz\output\renderer;
use mod_quiz\output\view_page;

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$userid = required_param('userid', PARAM_INT);
$cmid = required_param('cmid', PARAM_INT);

if (class_exists('mod_quiz\quiz_settings')) {
    class_alias('\mod_quiz\quiz_settings', '\quiz_settings_alias');
} else {
    require_once($CFG->dirroot . '/mod/quiz/locallib.php');
    class_alias('\quiz', '\quiz_settings_alias');
}

if ($cmid) {
    $quizobj = quiz_settings_alias::create($cmid, $USER->id);
}
$quiz = $quizobj->get_quiz();
$cm = $quizobj->get_cm();
$course = $quizobj->get_course();
$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);

// Check login and get context.
require_login($course, false, $cm);
$context = $quizobj->get_context();

$PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php'));
$PAGE->set_title(get_string('reviewattempts', 'quizaccess_quizproctoring'));
$PAGE->set_pagelayout('course');
$PAGE->navbar->add(get_string('quizaccess_quizproctoring', 'quizaccess_quizproctoring'), '/mod/quiz/accessrule/quizproctoring/reviewattempts.php');
$PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');

$table = new html_table();
$headers = array(
            get_string("fullname","quizaccess_quizproctoring"),
            get_string("email","quizaccess_quizproctoring"),
            get_string("attempts","quizaccess_quizproctoring")
        );
$table->head = $headers;
$output = $PAGE->get_renderer('mod_quiz');
echo $OUTPUT->header();
if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
    $backurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', 
        array('cmid' => $cmid, 'quizid' => $quiz->id));
    $btn = '<a class="btn btn-primary" href="'.$backurl.'">
    '.get_string("userimagereport","quizaccess_quizproctoring").'</a>';
}
echo '<div class="attempttitle">' .
     '<h5>' . $quiz->name .': '.get_string('reviewattemptsu', 'quizaccess_quizproctoring',
     	$user->firstname . ' ' . $user->lastname) . '</h5>' .
     '<div>' . $btn . '</div>' .
     '</div><br/>';

$namelink = html_writer::link(
    new moodle_url('/user/view.php', array('id' => $user->id)),
    $user->firstname . ' ' . $user->lastname
);
$attempts = $DB->get_records('quiz_attempts', array('quiz' => $quiz->id, 'userid' => $user->id), 'attempt ASC');

// Prepare an array to hold the attempt numbers
$attemptNumbers = array();
foreach ($attempts as $attempt) {
    $attempt_url = new moodle_url('/mod/quiz/review.php', array('attempt' => $attempt->id));
    //$attemptNumbers[] = '<a href="' . $attempt_url->out() . '">' . $attempt->attempt . '</a>';
    $attemptNumbers[] = '<div class="proctoringimage" data-attemptid="'.$attempt->id.'" data-quizid="'.$quiz->id.'" data-userid="'.$user->id.'">'. $attempt->attempt .'</div>';
}
$attemptList = implode(', ', $attemptNumbers);
//print_object($attemptNumbers);die;
$table->data[] = array($namelink, $user->email, $attemptList);
echo html_writer::table($table);
echo $OUTPUT->footer();