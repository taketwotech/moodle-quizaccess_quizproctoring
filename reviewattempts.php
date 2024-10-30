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
$perpage = 10;
$page = optional_param('page', 0, PARAM_INT);
$sort = optional_param('sort', 'attempt', PARAM_ALPHA);
$dir = optional_param('dir', 'ASC', PARAM_ALPHA);

$attemptssort = ($sort === 'attempt' && $dir === 'ASC') ? 'DESC' : 'ASC';
$arrowup = ' ▲';
$arrowdown = ' ▼';

$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
$attemptarrow = ($sort === 'attempt') ? ($dir === 'ASC' ? $arrowup : $arrowdown) : '';

// Check login and get context.
$context = context_module::instance($cmid, MUST_EXIST);
list($course, $cm) = get_course_and_cm_from_cmid($cmid, 'quiz');
require_login($course, true, $cm);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);
$proctoringimageshow = get_config('quizaccess_quizproctoring', 'proctoring_image_show');
if ($proctoringimageshow == 1) {
    $PAGE->set_url(new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php',
        ['userid' => $userid, 'cmid' => $cmid, 'quizid' => $quizid]));
    $PAGE->set_title(get_string('reviewattempts', 'quizaccess_quizproctoring'));

    $PAGE->navbar->add(get_string('quizaccess_quizproctoring', 'quizaccess_quizproctoring'),
        '/mod/quiz/accessrule/quizproctoring/reviewattempts.php');
    $PAGE->requires->js_call_amd('quizaccess_quizproctoring/report', 'init');
    $PAGE->requires->strings_for_js(['noimageswarning', 'proctoringimages',
    'attemptstarted', 'proctoringidentity', 'allimages'], 'quizaccess_quizproctoring');
    $PAGE->requires->jquery();
    $PAGE->requires->css(new moodle_url($CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/libraries/css/lightbox.min.css'));
    $PAGE->requires->js(new moodle_url($CFG->wwwroot . '/mod/quiz/accessrule/quizproctoring/libraries/js/lightbox.min.js'), true);
    $storerecord = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $cm->instance]);
    $table = new html_table();
    $headers = [
        get_string("email", "quizaccess_quizproctoring"),
        html_writer::link(new moodle_url($PAGE->url, ['sort' => 'attempt', 'dir' => $attemptssort]),
        get_string("attempts", "quizaccess_quizproctoring") . $attemptarrow),
        get_string("started", "quizaccess_quizproctoring"),
        get_string("submitted", "quizaccess_quizproctoring"),
        get_string("duration", "quizaccess_quizproctoring"),
        get_string("proctoringimages", "quizaccess_quizproctoring") .
        ($storerecord->storeallimages ? '
        <input type="checkbox" id="storeallimages" name="storeallimages" value="1" />' : ''),
        get_string("proctoringidentity", "quizaccess_quizproctoring"),
        get_string("isautosubmit", "quizaccess_quizproctoring"),
    ];
    $table->head = $headers;
    $output = $PAGE->get_renderer('mod_quiz');
    echo $OUTPUT->header();
    if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
        $backurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', [
            'cmid' => $cmid,
            'quizid' => $quizid,
        ]);
        $btn = '<a class="btn btn-primary" href="'.$backurl.'">
        '.get_string("userimagereport", "quizaccess_quizproctoring").'</a>';
    }
    echo '<div class="headtitle">' .
    '<p>'.get_string('reviewattemptsu', 'quizaccess_quizproctoring',
        $user->firstname . ' ' . $user->lastname) . '</p>' .
    '<div>' . $btn . '</div>' .
    '</div><br/>';

    $namelink = html_writer::link(
        new moodle_url('/user/view.php', ['id' => $user->id]),
        $user->email
    );
    $totalattempts = $DB->count_records('quiz_attempts', ['quiz' => $quizid, 'userid' => $userid]);
    $sortcolumns = [
        'attempt' => 'qa.attempt',
    ];
    $sortcolumn = isset($sortcolumns[$sort]) ? $sortcolumns[$sort] : $sortcolumns['attempt'];

    $attempts = $DB->get_records_sql("
        SELECT qa.*
        FROM {quiz_attempts} qa
        JOIN {user} u ON qa.userid = u.id
        WHERE qa.quiz = :quizid AND qa.userid = :userid
        ORDER BY $sortcolumn $dir
    ", ['quizid' => $quizid, 'userid' => $userid], $page * $perpage, $perpage);
    foreach ($attempts as $attempt) {
        $usermages = $DB->get_record('quizaccess_proctor_data', [
                        'quizid' => $quizid,
                        'userid' => $user->id,
                        'attemptid' => $attempt->id,
                        'image_status' => 'M',
                    ]);
        $attemptsurl = new moodle_url('/mod/quiz/review.php', ['attempt' => $attempt->id]);
        $attempturl = '<a href="' . $attemptsurl->out() . '">' . $attempt->attempt . '</a>';
        $finishtime = $timetaken = get_string('inprogress', 'quiz');
        $timestart = userdate($attempt->timestart, get_string('strftimerecent', 'langconfig'));
        if ($attempt->timefinish) {
            $finishtime = userdate($attempt->timefinish, get_string('strftimerecent', 'langconfig'));
            $timetaken = format_time($attempt->timefinish - $attempt->timestart);
        }
        $pimages = '<img class="imageicon proctoringimage" data-attemptid="'.$attempt->id.'"
        data-quizid="'.$quizid.'" data-userid="'.$user->id.'" data-startdate="'.$timestart.'"
        data-all="false" src="' . $OUTPUT->image_url('icon', 'quizaccess_quizproctoring') . '" alt="icon">';
        $pindentity = '';
        if ($usermages->user_identity && $usermages->user_identity != 0) {
            $pindentity = '<img class="imageicon proctoridentity" data-attemptid="'.$attempt->id.'"
            data-quizid="'.$quizid.'" data-userid="'.$user->id.'" src="' . $OUTPUT->image_url('identity',
                'quizaccess_quizproctoring') . '" alt="icon">';
        }
        if ($usermages->isautosubmit) {
            $submit = '<div class="submittag">Yes</div>';
        } else {
            $submit = 'No';
        }
        $row = [$namelink, $attempturl, $timestart, $finishtime, $timetaken, $pimages, $pindentity, $submit];
        $table->data[] = $row;
    }
    echo html_writer::table($table);
    echo $OUTPUT->paging_bar($totalattempts, $page, $perpage, $PAGE->url->out(true, ['sort' => $sort, 'dir' => $dir]));
    echo $OUTPUT->footer();
} else {
    redirect(new moodle_url('/'));
}
