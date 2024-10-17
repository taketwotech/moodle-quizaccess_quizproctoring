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

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');

$userid = required_param('userid', PARAM_INT);
$cmid = required_param('cmid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);

$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);

// Check login and get context.
$context = context_module::instance($cmid, MUST_EXIST);
list($course, $cm) = get_course_and_cm_from_cmid($cmid, 'quiz');
require_login($course, true, $cm);
require_capability('quizaccess/quizproctoring:quizproctoringstudentreport', $context);
$proctoringimageshow = get_config('quizaccess_quizproctoring', 'proctoring_image_show');
if ($proctoringimageshow == 1) {

$PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php'));
$PAGE->set_title(get_string('reviewattempts', 'quizaccess_quizproctoring'));

$PAGE->navbar->add(get_string('quizaccess_quizproctoring', 'quizaccess_quizproctoring'), '/mod/quiz/accessrule/quizproctoring/reviewattempts.php');
$PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');
$PAGE->requires->strings_for_js(['noimageswarning', 'proctoringimages',
                            'proctoringidentity'], 'quizaccess_quizproctoring');
$PAGE->requires->jquery();
$PAGE->requires->css(new moodle_url($CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/libraries/css/lightbox.min.css'));
$PAGE->requires->js(new moodle_url($CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/libraries/js/lightbox.min.js'), true);

    $table = new html_table();
    $headers = array(
                get_string("email","quizaccess_quizproctoring"),
                get_string("attempts","quizaccess_quizproctoring"),
                get_string("submitted","quizaccess_quizproctoring"),
                get_string("duration","quizaccess_quizproctoring"),
                get_string("proctoringimages","quizaccess_quizproctoring"),
                get_string("proctoringidentity","quizaccess_quizproctoring"),            
                get_string("isautosubmit","quizaccess_quizproctoring"),
            );
    $table->head = $headers;
    $table->colclasses = array('', '', 'reviewimage');
    $output = $PAGE->get_renderer('mod_quiz');
    echo $OUTPUT->header();
    if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
        $backurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', 
            array('cmid' => $cmid, 'quizid' => $quizid));
        $btn = '<a class="btn btn-primary" href="'.$backurl.'">
        '.get_string("userimagereport","quizaccess_quizproctoring").'</a>';
    }
    echo '<div class="attempttitle">' .
         '<h5>'.get_string('reviewattemptsu', 'quizaccess_quizproctoring',
         	$user->firstname . ' ' . $user->lastname) . '</h5>' .
         '<div>' . $btn . '</div>' .
         '</div><br/>';

    $namelink = html_writer::link(
        new moodle_url('/user/view.php', array('id' => $user->id)),
        $user->email
    );
    $attempts = $DB->get_records('quiz_attempts', array('quiz' => $quizid, 'userid' => $user->id), 'attempt ASC');

    // Prepare an array to hold the attempt numbers
    $attemptNumbers = array();
    foreach ($attempts as $attempt) {
        $usermages = $DB->get_record('quizaccess_proctor_data', [
                        'quizid' => $quizid,
                        'userid' => $user->id,
                        'attemptid' => $attempt->id,
                        'image_status' => 'M',
                    ]);
        $attempt_url = new moodle_url('/mod/quiz/review.php', array('attempt' => $attempt->id));
        $attempturl = '<a href="' . $attempt_url->out() . '">' . $attempt->attempt . '</a>';
        $attemptNumbers = $attempt->attempt;
        $timetaken = $attempt->timefinish - $attempt->timestart;
        $pimages = '<img class="imageicon proctoringimage" data-attemptid="'.$attempt->id.'" data-quizid="'.$quizid.'" data-userid="'.$user->id.'" src="' . $OUTPUT->image_url('icon', 'quizaccess_quizproctoring') . '" alt="icon">';
        $pindentity = '';
        if ($usermages->user_identity && $usermages->user_identity != 0) {
            $pindentity = '<img class="imageicon proctoridentity" data-attemptid="'.$attempt->id.'" data-quizid="'.$quizid.'" data-userid="'.$user->id.'" src="' . $OUTPUT->image_url('identity', 'quizaccess_quizproctoring') . '" alt="icon">';
        }
        if ($usermages->isautosubmit) {
            $submit = '<div class="submittag">Yes</div>';
        } else {
            $submit = 'No';
        }
        $table->data[] = array($namelink, $attempturl, userdate($attempt->timefinish, get_string('strftimerecent', 'langconfig')), format_time($timetaken), $pimages, $pindentity, $submit);
    }
    echo html_writer::table($table);
    echo $OUTPUT->footer();
}